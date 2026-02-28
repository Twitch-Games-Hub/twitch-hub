import { logger } from '../logger.js';
import {
  constructWebhookEvent,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '../services/StripeService.js';
import type Stripe from 'stripe';
import type { FastifyPluginAsync } from 'fastify';

const log = logger.child({ module: 'webhook' });

export const webhookPlugin: FastifyPluginAsync = async (app) => {
  // Scoped raw body parser — only applies within this plugin
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  app.post('/webhook', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      reply.code(400);
      return { error: 'Missing stripe-signature header' };
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(request.body as Buffer, signature);
    } catch (err) {
      log.warn({ err }, 'Webhook signature verification failed');
      reply.code(400);
      return { error: 'Invalid signature' };
    }

    log.info({ type: event.type, id: event.id }, 'Webhook received');

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          log.info({ type: event.type }, 'Unhandled webhook event');
      }
    } catch (err) {
      log.error({ err, type: event.type }, 'Webhook handler error');
      reply.code(500);
      return { error: 'Webhook processing failed' };
    }

    return { received: true };
  });
};
