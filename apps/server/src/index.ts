import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config, validateConfig } from './config.js';
import { authRouter } from './auth.js';
import { gamesRouter } from './routes/games.js';
import { createSocketServer } from './socket/index.js';
import { gameRegistry } from './engine/GameRegistry.js';
import { redis } from './db/redis.js';
import { prisma } from './db/client.js';

// Validate required env vars before anything else
validateConfig();

// Process-level error handlers
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

const app = express();
app.use(cors({ origin: config.appUrl, credentials: true }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      }),
    );
  });
  next();
});

// Health check — verifies Redis and Postgres
app.get('/health', async (_req, res) => {
  try {
    await Promise.all([redis.ping(), prisma.$queryRaw`SELECT 1`]);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err);
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

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
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
redis.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err.message);
});

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  httpServer.close();

  // Close all Socket.IO connections
  io.close();

  // Cleanup all game engines (clears Redis keys, timers)
  await gameRegistry.cleanupAll();

  // Close database connections
  await redis.quit();
  await prisma.$disconnect();

  console.log('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, httpServer, io };
