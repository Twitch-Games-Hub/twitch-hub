import * as Sentry from '@sentry/node';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { buildApp } from './app.js';
import { authPlugin } from './auth.js';
import { gamesPlugin } from './routes/games.js';
import { explorePlugin } from './routes/explore.js';
import { profilePlugin } from './routes/profile.js';
import { sessionsPlugin } from './routes/sessions.js';
import { bookmarksPlugin } from './routes/bookmarks.js';
import { billingPlugin } from './routes/billing.js';
import { webhookPlugin } from './routes/webhook.js';
import { moderatorsPlugin } from './routes/moderators.js';
import { notificationsPlugin } from './routes/notifications.js';
import { invitesPlugin } from './routes/invites.js';
import { gamificationPlugin } from './routes/gamification.js';
import { createSocketServer } from './socket/index.js';
import { gameRegistry } from './engine/GameRegistry.js';
import { gamificationService } from './services/GamificationService.js';
import { redis } from './db/redis.js';
import { prisma } from './db/client.js';

// Validate required env vars before anything else
validateConfig();

// Process-level error handlers
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
  Sentry.captureException(reason);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  Sentry.captureException(err);
  process.exit(1);
});

const app = await buildApp();

// Webhook plugin must be registered first — its scoped content-type parser
// returns raw Buffer for Stripe signature verification
await app.register(webhookPlugin, { prefix: '/api/billing' });

// Health check — verifies Redis and Postgres
app.get('/health', { logLevel: 'silent' }, async (request, reply) => {
  try {
    await Promise.all([redis.ping(), prisma.$queryRaw`SELECT 1`]);
    return { status: 'ok' };
  } catch (err) {
    logger.warn({ err }, 'Health check failed');
    reply.code(503);
    return { status: 'degraded', error: 'Dependency check failed' };
  }
});

// API routes
await app.register(authPlugin, { prefix: '/api/auth' });
await app.register(gamesPlugin, { prefix: '/api/games' });
await app.register(explorePlugin, { prefix: '/api/explore' });
await app.register(profilePlugin, { prefix: '/api/profile' });
await app.register(sessionsPlugin, { prefix: '/api/sessions' });
await app.register(bookmarksPlugin, { prefix: '/api/bookmarks' });
await app.register(billingPlugin, { prefix: '/api/billing' });
await app.register(moderatorsPlugin, { prefix: '/api/moderators' });
await app.register(notificationsPlugin, { prefix: '/api/notifications' });
await app.register(invitesPlugin, { prefix: '/api/sessions' });
await app.register(gamificationPlugin, { prefix: '/api/gamification' });

// Sentry error handler (must be before custom error handler)
Sentry.setupFastifyErrorHandler(app);

// Global error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error(
    { err: error, path: request.url, method: request.method, userId: request.userId },
    'Unhandled error',
  );
  reply.code(500).send({ error: 'Internal server error' });
});

// Socket.IO
const io = createSocketServer(app);

// Wire game engine broadcast to Socket.IO
const broadcastToSession = (sessionId: string, event: string, data: unknown) => {
  const namespaces = ['/dashboard', '/play', '/overlay'] as const;
  for (const ns of namespaces) {
    (io.of(ns).to(sessionId) as { emit: (event: string, data: unknown) => void }).emit(event, data);
  }
};
gameRegistry.setBroadcastCallback(broadcastToSession);
gamificationService.setBroadcastCallback(broadcastToSession);

// Connect Redis
redis.connect().catch((err: Error) => {
  logger.error({ err }, 'Failed to connect to Redis');
});

await app.listen({ port: config.port, host: '0.0.0.0' });

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  // Stop accepting new connections and close Fastify
  await app.close();

  // Close all Socket.IO connections
  io.close();

  // Cleanup all game engines (clears Redis keys, timers)
  await gameRegistry.cleanupAll();

  // Close database connections
  await redis.quit();
  await prisma.$disconnect();

  // Flush error tracking before exit
  await Sentry.close(2000);

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, io };
