import { prisma } from '../db/client.js';
import { FREE_SESSIONS_PER_MONTH } from '@twitch-hub/shared-types';
import type { SessionBudget } from '@twitch-hub/shared-types';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { trackEvent } from '../services/PostHogService.js';

export async function attachSessionBudget(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.userId) {
    reply.code(401).send({ error: 'Not authenticated' });
    return;
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: request.userId } });
  const isSubscriber = sub?.status === 'ACTIVE';

  if (isSubscriber) {
    request.sessionBudget = {
      canCreateSession: true,
      source: 'subscriber',
      freeRemaining: FREE_SESSIONS_PER_MONTH,
      creditsRemaining: sub?.sessionCredits ?? 0,
      isSubscriber: true,
    };
    return;
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sessionsThisMonth = await prisma.gameSession.count({
    where: { hostId: request.userId, createdAt: { gte: monthStart } },
  });

  const freeRemaining = Math.max(0, FREE_SESSIONS_PER_MONTH - sessionsThisMonth);
  const creditsRemaining = sub?.sessionCredits ?? 0;

  if (freeRemaining > 0) {
    request.sessionBudget = {
      canCreateSession: true,
      source: 'free',
      freeRemaining,
      creditsRemaining,
      isSubscriber: false,
    };
    return;
  }

  if (creditsRemaining > 0) {
    request.sessionBudget = {
      canCreateSession: true,
      source: 'credits',
      freeRemaining: 0,
      creditsRemaining,
      isSubscriber: false,
    };
    return;
  }

  request.sessionBudget = {
    canCreateSession: false,
    source: 'none',
    freeRemaining: 0,
    creditsRemaining: 0,
    isSubscriber: false,
  };
  trackEvent(request.userId!, 'session_budget_exhausted', {});
}

/**
 * Computes a session budget for a given userId (for use in socket handlers).
 */
export async function computeSessionBudget(userId: string): Promise<SessionBudget> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const isSubscriber = sub?.status === 'ACTIVE';

  if (isSubscriber) {
    return {
      canCreateSession: true,
      source: 'subscriber',
      freeRemaining: FREE_SESSIONS_PER_MONTH,
      creditsRemaining: sub?.sessionCredits ?? 0,
      isSubscriber: true,
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sessionsThisMonth = await prisma.gameSession.count({
    where: { hostId: userId, createdAt: { gte: monthStart } },
  });

  const freeRemaining = Math.max(0, FREE_SESSIONS_PER_MONTH - sessionsThisMonth);
  const creditsRemaining = sub?.sessionCredits ?? 0;

  if (freeRemaining > 0) {
    return {
      canCreateSession: true,
      source: 'free',
      freeRemaining,
      creditsRemaining,
      isSubscriber: false,
    };
  }

  if (creditsRemaining > 0) {
    return {
      canCreateSession: true,
      source: 'credits',
      freeRemaining: 0,
      creditsRemaining,
      isSubscriber: false,
    };
  }

  const result: SessionBudget = {
    canCreateSession: false,
    source: 'none',
    freeRemaining: 0,
    creditsRemaining: 0,
    isSubscriber: false,
  };
  trackEvent(userId, 'session_budget_exhausted', {});
  return result;
}

/**
 * Consumes one credit from the user's balance. Called after session creation
 * when the budget source is 'credits'.
 */
export async function consumeCredit(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: { sessionCredits: { decrement: 1 } },
  });
}
