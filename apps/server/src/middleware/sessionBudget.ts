import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client.js';
import { FREE_SESSIONS_PER_MONTH } from '@twitch-hub/shared-types';
import type { SessionBudget } from '@twitch-hub/shared-types';

export async function attachSessionBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  const isSubscriber = sub?.status === 'ACTIVE';

  if (isSubscriber) {
    req.sessionBudget = {
      canCreateSession: true,
      source: 'subscriber',
      freeRemaining: FREE_SESSIONS_PER_MONTH,
      creditsRemaining: sub?.sessionCredits ?? 0,
      isSubscriber: true,
    };
    next();
    return;
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sessionsThisMonth = await prisma.gameSession.count({
    where: { hostId: req.userId, createdAt: { gte: monthStart } },
  });

  const freeRemaining = Math.max(0, FREE_SESSIONS_PER_MONTH - sessionsThisMonth);
  const creditsRemaining = sub?.sessionCredits ?? 0;

  if (freeRemaining > 0) {
    req.sessionBudget = {
      canCreateSession: true,
      source: 'free',
      freeRemaining,
      creditsRemaining,
      isSubscriber: false,
    };
    next();
    return;
  }

  if (creditsRemaining > 0) {
    req.sessionBudget = {
      canCreateSession: true,
      source: 'credits',
      freeRemaining: 0,
      creditsRemaining,
      isSubscriber: false,
    };
    next();
    return;
  }

  req.sessionBudget = {
    canCreateSession: false,
    source: 'none',
    freeRemaining: 0,
    creditsRemaining: 0,
    isSubscriber: false,
  };
  next();
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

  return {
    canCreateSession: false,
    source: 'none',
    freeRemaining: 0,
    creditsRemaining: 0,
    isSubscriber: false,
  };
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
