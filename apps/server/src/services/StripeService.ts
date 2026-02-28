import Stripe from 'stripe';
import { config } from '../config.js';
import { prisma } from '../db/client.js';
import { logger } from '../logger.js';
import { CREDITS_PER_PACK } from '@twitch-hub/shared-types';
import { withStripeSpan, setStripeUserContext } from './sentryStripe.js';
import { trackEvent, identifyUser, setGroupProperties } from './PostHogService.js';

const log = logger.child({ module: 'stripe' });

const stripe = new Stripe(config.stripe.secretKey);

export async function getOrCreateCustomer(userId: string): Promise<string> {
  return withStripeSpan('stripe.customer.getOrCreate', { userId }, async () => {
    const sub = await prisma.subscription.findUnique({ where: { userId } });

    if (sub?.stripeCustomerId) return sub.stripeCustomerId;

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const customer = await stripe.customers.create({
      metadata: { userId },
      name: user.displayName,
    });

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    });

    setStripeUserContext(userId, customer.id);
    log.info({ userId, customerId: customer.id }, 'Stripe customer created');
    return customer.id;
  });
}

export async function createCheckoutSession(
  userId: string,
  product: 'monthly' | 'annual' | 'credits',
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  return withStripeSpan('stripe.checkout.create', { userId, product }, async () => {
    const customerId = await getOrCreateCustomer(userId);

    const isSubscription = product !== 'credits';
    const priceId =
      product === 'monthly'
        ? config.stripe.monthlyPriceId
        : product === 'annual'
          ? config.stripe.annualPriceId
          : config.stripe.creditPackPriceId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, product },
    });

    trackEvent(userId, 'checkout_initiated', {
      product,
      mode: isSubscription ? 'subscription' : 'payment',
    });

    log.info({ userId, product, sessionId: session.id }, 'Checkout session created');
    return session.url!;
  });
}

export async function createPortalSession(userId: string, returnUrl: string): Promise<string> {
  const customerId = await getOrCreateCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    log.warn({ sessionId: session.id }, 'Checkout completed without userId metadata');
    return;
  }

  await withStripeSpan('stripe.webhook.checkoutCompleted', { userId }, async () => {
    const product = session.metadata?.product;

    if (product === 'credits') {
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, sessionCredits: CREDITS_PER_PACK },
        update: { sessionCredits: { increment: CREDITS_PER_PACK } },
      });
      trackEvent(userId, 'credit_pack_purchased', { credits: CREDITS_PER_PACK });
      log.info({ userId, credits: CREDITS_PER_PACK }, 'Credit pack purchased');
      return;
    }

    // Subscription checkout — sync from the subscription object
    if (session.subscription) {
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(userId, subscription);
      trackEvent(userId, 'subscription_created', { subscriptionId });
      log.info({ userId, subscriptionId }, 'Subscription created via checkout');
    }
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  await withStripeSpan(
    'stripe.webhook.subscriptionUpdated',
    { subscriptionId: subscription.id },
    async () => {
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

      const sub = await prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (!sub) {
        log.warn({ customerId }, 'Subscription updated for unknown customer');
        return;
      }

      await syncSubscription(sub.userId, subscription);
      trackEvent(sub.userId, 'subscription_updated', { status: subscription.status });
      log.info({ userId: sub.userId, status: subscription.status }, 'Subscription updated');
    },
  );
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await withStripeSpan(
    'stripe.webhook.subscriptionDeleted',
    { subscriptionId: subscription.id },
    async () => {
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

      const sub = await prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (!sub) return;

      await prisma.subscription.update({
        where: { userId: sub.userId },
        data: {
          stripeSubscriptionId: null,
          stripePriceId: null,
          status: 'CANCELED',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      });

      trackEvent(sub.userId, 'subscription_cancelled', {});
      log.info({ userId: sub.userId }, 'Subscription deleted');
    },
  );
}

async function syncSubscription(userId: string, subscription: Stripe.Subscription): Promise<void> {
  return withStripeSpan('stripe.subscription.sync', { userId }, async () => {
    const status = mapStripeStatus(subscription.status);
    const priceId = subscription.items.data[0]?.price.id ?? null;
    const billingPlan = status === 'ACTIVE' ? 'SUBSCRIBER' : 'FREE';

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId:
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    identifyUser(userId, { billing_plan: billingPlan });
    setGroupProperties('billing_plan', billingPlan, { name: billingPlan });
  });
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
      return 'CANCELED';
    default:
      return 'INCOMPLETE';
  }
}

export function constructWebhookEvent(body: Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret);
}
