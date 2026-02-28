import { Router } from 'express';
import express from 'express';
import { logger } from '../logger.js';
import {
  constructWebhookEvent,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '../services/StripeService.js';
import type Stripe from 'stripe';

const log = logger.child({ module: 'webhook' });

export const webhookRouter = Router();

// Raw body parser — must NOT use express.json()
webhookRouter.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(req.body as Buffer, signature);
    } catch (err) {
      log.warn({ err }, 'Webhook signature verification failed');
      res.status(400).json({ error: 'Invalid signature' });
      return;
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
      res.status(500).json({ error: 'Webhook processing failed' });
      return;
    }

    res.json({ received: true });
  },
);
