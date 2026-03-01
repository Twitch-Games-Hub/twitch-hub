import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import { prisma } from './db/client.js';
import { config } from './config.js';
import { logger } from './logger.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

const log = logger.child({ module: 'auth' });

export const authPlugin: FastifyPluginAsync = async (app) => {
  // Upsert user from Twitch OAuth callback (internal-only)
  app.post(
    '/upsert',
    {
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        const secret = request.headers['x-internal-secret'];
        if (!config.internalApiSecret || secret !== config.internalApiSecret) {
          log.warn('Upsert rejected: invalid internal secret');
          reply.code(403).send({ error: 'Forbidden' });
          return;
        }
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        twitchId,
        twitchLogin,
        displayName,
        profileImageUrl,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      } = request.body as Record<string, string>;

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

      return { token, user: sanitizeUser(user) };
    },
  );

  // Get current user from JWT
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401);
      return { error: 'Missing token' };
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      log.warn('/me invalid token');
      reply.code(401);
      return { error: 'Invalid token' };
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { subscription: true },
    });
    if (!user) {
      log.warn({ userId: payload.userId }, '/me user not found');
      reply.code(401);
      return { error: 'User not found' };
    }
    return sanitizeUser(user);
  });
};

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

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing token' });
    return;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    log.warn({ path: request.url }, 'Auth middleware rejected invalid token');
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }

  request.userId = payload.userId;
  Sentry.setUser({ id: payload.userId });
}
