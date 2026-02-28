import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './db/client.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { asyncHandler } from './middleware/asyncHandler.js';
import type { Request, Response, NextFunction } from 'express';

const log = logger.child({ module: 'auth' });

export const authRouter = Router();

// Upsert user from Twitch OAuth callback (internal-only)
authRouter.post(
  '/upsert',
  (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-internal-secret'];
    if (!config.internalApiSecret || secret !== config.internalApiSecret) {
      log.warn('Upsert rejected: invalid internal secret');
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  },
  asyncHandler(async (req: Request, res: Response) => {
    const {
      twitchId,
      twitchLogin,
      displayName,
      profileImageUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    } = req.body;

    const user = await prisma.user.upsert({
      where: { twitchId },
      create: {
        twitchId,
        twitchLogin,
        displayName,
        profileImageUrl,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(tokenExpiresAt),
        role: 'STREAMER',
        subscription: { create: {} },
      },
      update: {
        twitchLogin,
        displayName,
        profileImageUrl,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(tokenExpiresAt),
      },
      include: { subscription: true },
    });

    // Ensure subscription row exists for existing users
    if (!user.subscription) {
      await prisma.subscription.create({ data: { userId: user.id } });
    }

    log.info({ twitchLogin, userId: user.id }, 'User authenticated');

    const token = jwt.sign({ userId: user.id, twitchId: user.twitchId }, config.jwtSecret, {
      expiresIn: '7d',
    });

    res.json({ token, user: sanitizeUser(user) });
  }),
);

// Get current user from JWT
authRouter.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      log.warn('/me invalid token');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { subscription: true },
    });
    if (!user) {
      log.warn({ userId: payload.userId }, '/me user not found');
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json(sanitizeUser(user));
  }),
);

function sanitizeUser(user: {
  id: string;
  twitchId: string;
  twitchLogin: string;
  displayName: string;
  profileImageUrl: string | null;
  role: string;
  subscription?: { status: string | null } | null;
}) {
  const isSubscriber = user.subscription?.status === 'ACTIVE';
  return {
    id: user.id,
    twitchId: user.twitchId,
    twitchLogin: user.twitchLogin,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    billingPlan: isSubscriber ? 'SUBSCRIBER' : 'FREE',
  };
}

// Middleware to extract user from JWT for Socket.IO and other routes
export function verifyToken(token: string): { userId: string; twitchId: string } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: string; twitchId: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    log.warn({ path: req.path }, 'Auth middleware rejected invalid token');
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.userId = payload.userId;
  next();
}
