import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './db/client.js';
import { config } from './config.js';
import type { Request, Response, NextFunction } from 'express';

export const authRouter = Router();

// Upsert user from Twitch OAuth callback
authRouter.post('/upsert', async (req: Request, res: Response) => {
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
    },
    update: {
      twitchLogin,
      displayName,
      profileImageUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(tokenExpiresAt),
    },
  });

  const token = jwt.sign(
    { userId: user.id, twitchId: user.twitchId },
    config.jwtSecret,
    { expiresIn: '7d' },
  );

  res.json({ token, user: sanitizeUser(user) });
});

// Get current user from JWT
authRouter.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json(sanitizeUser(user));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

function sanitizeUser(user: { id: string; twitchId: string; twitchLogin: string; displayName: string; profileImageUrl: string | null; role: string }) {
  return {
    id: user.id,
    twitchId: user.twitchId,
    twitchLogin: user.twitchLogin,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
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
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  (req as Request & { userId: string }).userId = payload.userId;
  next();
}
