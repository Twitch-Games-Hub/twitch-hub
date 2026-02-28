import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config, validateConfig } from './config.js';
import { logger, httpLogger } from './logger.js';
import { authRouter } from './auth.js';
import { gamesRouter } from './routes/games.js';
import { exploreRouter } from './routes/explore.js';
import { profileRouter } from './routes/profile.js';
import { sessionsRouter } from './routes/sessions.js';
import { createSocketServer } from './socket/index.js';
import { gameRegistry } from './engine/GameRegistry.js';
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

const app = express();
app.use(cors({ origin: config.appUrl, credentials: true }));
app.use(express.json());

// Structured request logging via pino-http
app.use(httpLogger);

// Health check — verifies Redis and Postgres
app.get('/health', async (_req, res) => {
  try {
    await Promise.all([redis.ping(), prisma.$queryRaw`SELECT 1`]);
    res.json({ status: 'ok' });
  } catch (err) {
    logger.warn({ err }, 'Health check failed');
    res.status(503).json({ status: 'degraded', error: 'Dependency check failed' });
  }
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/profile', profileRouter);
app.use('/api/sessions', sessionsRouter);

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error(
    { err, path: req.path, method: req.method, params: req.params, userId: req.userId },
    'Unhandled error',
  );
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = createServer(app);

// Socket.IO
const io = createSocketServer(httpServer);

// Wire game engine broadcast to Socket.IO
gameRegistry.setBroadcastCallback((sessionId, event, data) => {
  const namespaces = ['/dashboard', '/play', '/overlay'] as const;
  for (const ns of namespaces) {
    (io.of(ns).to(sessionId) as { emit: (event: string, data: unknown) => void }).emit(event, data);
  }
});

// Connect Redis
redis.connect().catch((err: Error) => {
  logger.error({ err }, 'Failed to connect to Redis');
});

httpServer.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server started');
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  // Stop accepting new connections
  httpServer.close();

  // Close all Socket.IO connections
  io.close();

  // Cleanup all game engines (clears Redis keys, timers)
  await gameRegistry.cleanupAll();

  // Close database connections
  await redis.quit();
  await prisma.$disconnect();

  // Flush Sentry events before exit
  await Sentry.close(2000);

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, httpServer, io };
