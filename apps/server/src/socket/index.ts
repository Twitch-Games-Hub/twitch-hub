import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { socketAuthMiddleware, optionalSocketAuthMiddleware } from './middleware.js';
import { registerGameHandlers } from './handlers/gameHandler.js';
import { registerVoteHandlers } from './handlers/voteHandler.js';
import { registerReactionHandlers } from './handlers/reactionHandler.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { createSessionJoinHandler, registerSocketLifecycleHandlers } from './helpers.js';
import { trackUser, untrackUser } from './sessionUsers.js';
import { notificationBroadcaster } from './notificationBroadcaster.js';

export type AppSocket =
  ReturnType<typeof createSocketServer> extends Server<ClientToServerEvents, ServerToClientEvents>
    ? Parameters<Parameters<Server<ClientToServerEvents, ServerToClientEvents>['on']>[1]>[0]
    : never;

export function createSocketServer(app: FastifyInstance) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    cors: {
      origin: config.appUrl,
      credentials: true,
    },
  });

  const dashboardLog = logger.child({ module: 'socket', namespace: 'dashboard' });
  const playLog = logger.child({ module: 'socket', namespace: 'play' });
  const overlayLog = logger.child({ module: 'socket', namespace: 'overlay' });

  // Namespaces
  const dashboard = io.of('/dashboard');
  const play = io.of('/play');
  const overlay = io.of('/overlay');

  // Auth middleware for dashboard (requires login)
  dashboard.use(socketAuthMiddleware);

  // Play namespace: optional auth (attach userId if token provided)
  play.use(optionalSocketAuthMiddleware);
  // Overlay is fully public
  overlay.use((_socket, next) => next());

  // Wire notification broadcaster
  notificationBroadcaster.setServer(io);

  // Register handlers
  dashboard.on('connection', (socket) => {
    dashboardLog.debug({ socketId: socket.id }, 'Dashboard client connected');
    registerGameHandlers(socket, io);
    registerVoteHandlers(socket, io);

    // Track user for real-time notifications
    if (socket.data.userId) {
      notificationBroadcaster.trackUser(socket.data.userId, socket.id);
    }

    socket.on('disconnect', () => {
      notificationBroadcaster.untrackUser(socket.id);
    });

    registerSocketLifecycleHandlers(socket, dashboardLog, 'Dashboard');
  });

  play.on('connection', (socket) => {
    playLog.debug(
      { socketId: socket.id, userId: socket.data.userId ?? 'anonymous' },
      'Player connected',
    );
    registerVoteHandlers(socket, io);
    registerReactionHandlers(socket, io);

    const playJoinHandler = createSessionJoinHandler(playLog);
    socket.on('session:join', async (sessionId) => {
      await playJoinHandler(socket, sessionId);
      const users = await trackUser(sessionId, socket.id, socket.data.userId);
      dashboard.to(sessionId).emit('session:users', users);
    });

    socket.on('disconnect', () => {
      const result = untrackUser(socket.id);
      if (result) {
        dashboard.to(result.sessionId).emit('session:users', result.users);
      }
      playLog.debug({ socketId: socket.id }, 'Play client disconnected');
    });

    registerSocketLifecycleHandlers(socket, playLog, 'Play');
  });

  overlay.on('connection', (socket) => {
    overlayLog.debug({ socketId: socket.id }, 'Overlay connected');

    const overlayJoinHandler = createSessionJoinHandler(overlayLog);
    socket.on('session:join', (sessionId) => overlayJoinHandler(socket, sessionId));
    registerSocketLifecycleHandlers(socket, overlayLog, 'Overlay');
  });

  return io;
}
