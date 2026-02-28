import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { authRouter } from './auth.js';
import { gamesRouter } from './routes/games.js';
import { createSocketServer } from './socket/index.js';
import { gameRegistry } from './engine/GameRegistry.js';
import { redis } from './db/redis.js';

const app = express();
app.use(cors({ origin: config.appUrl, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);

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

export { app, httpServer, io };
