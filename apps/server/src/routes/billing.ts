import { authMiddleware } from '../auth.js';
import { attachSessionBudget } from '../middleware/sessionBudget.js';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import {
  BillingPlan,
  FREE_SESSIONS_PER_MONTH,
  type ApiSubscription,
} from '@twitch-hub/shared-types';
import { createCheckoutSession, createPortalSession } from '../services/StripeService.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export const billingPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // GET /subscription — current subscription status
  app.get(
    '/subscription',
    { preHandler: [attachSessionBudget] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.userId! },
      });

      const budget = request.sessionBudget!;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const sessionsThisMonth = await prisma.gameSession.count({
        where: { hostId: request.userId!, createdAt: { gte: monthStart } },
      });

      const result: ApiSubscription = {
        plan: budget.isSubscriber ? BillingPlan.SUBSCRIBER : BillingPlan.FREE,
        sessionCredits: sub?.sessionCredits ?? 0,
        freeSessionsUsed: sessionsThisMonth,
        freeSessionsLimit: FREE_SESSIONS_PER_MONTH,
        currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      };

      return result;
    },
  );

  // POST /checkout — create Stripe checkout session
  app.post('/checkout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { product } = request.body as { product: 'monthly' | 'annual' | 'credits' };

    if (!['monthly', 'annual', 'credits'].includes(product)) {
      reply.code(400);
      return { error: 'Invalid product' };
    }

    const successUrl = `${config.appUrl}/dashboard/billing?success=true`;
    const cancelUrl = `${config.appUrl}/dashboard/billing?canceled=true`;

    const checkoutUrl = await createCheckoutSession(
      request.userId!,
      product,
      successUrl,
      cancelUrl,
    );

    return { checkoutUrl };
  });

  // POST /portal — create Stripe Customer Portal session
  app.post('/portal', async (request: FastifyRequest, reply: FastifyReply) => {
    const returnUrl = `${config.appUrl}/dashboard/billing`;
    const portalUrl = await createPortalSession(request.userId!, returnUrl);
    return { portalUrl };
  });
};
