import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { attachSessionBudget } from '../middleware/sessionBudget.js';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import {
  BillingPlan,
  FREE_SESSIONS_PER_MONTH,
  type ApiSubscription,
} from '@twitch-hub/shared-types';
import { createCheckoutSession, createPortalSession } from '../services/StripeService.js';

export const billingRouter = Router();

billingRouter.use(authMiddleware);

// GET /api/billing/subscription — current subscription status
billingRouter.get(
  '/subscription',
  attachSessionBudget,
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.userId! },
    });

    const budget = req.sessionBudget!;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const sessionsThisMonth = await prisma.gameSession.count({
      where: { hostId: req.userId!, createdAt: { gte: monthStart } },
    });

    const result: ApiSubscription = {
      plan: budget.isSubscriber ? BillingPlan.SUBSCRIBER : BillingPlan.FREE,
      sessionCredits: sub?.sessionCredits ?? 0,
      freeSessionsUsed: sessionsThisMonth,
      freeSessionsLimit: FREE_SESSIONS_PER_MONTH,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    };

    res.json(result);
  }),
);

// POST /api/billing/checkout — create Stripe checkout session
billingRouter.post(
  '/checkout',
  asyncHandler(async (req, res) => {
    const { product } = req.body as { product: 'monthly' | 'annual' | 'credits' };

    if (!['monthly', 'annual', 'credits'].includes(product)) {
      res.status(400).json({ error: 'Invalid product' });
      return;
    }

    const successUrl = `${config.appUrl}/dashboard/billing?success=true`;
    const cancelUrl = `${config.appUrl}/dashboard/billing?canceled=true`;

    const checkoutUrl = await createCheckoutSession(req.userId!, product, successUrl, cancelUrl);

    res.json({ checkoutUrl });
  }),
);

// POST /api/billing/portal — create Stripe Customer Portal session
billingRouter.post(
  '/portal',
  asyncHandler(async (req, res) => {
    const returnUrl = `${config.appUrl}/dashboard/billing`;
    const portalUrl = await createPortalSession(req.userId!, returnUrl);
    res.json({ portalUrl });
  }),
);
