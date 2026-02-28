import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { socketAuthMiddleware } from './middleware.js';
import { registerGameHandlers } from './handlers/gameHandler.js';
import { registerVoteHandlers } from './handlers/voteHandler.js';
import { config } from '../config.js';

export type AppSocket =
  ReturnType<typeof createSocketServer> extends Server<ClientToServerEvents, ServerToClientEvents>
    ? Parameters<Parameters<Server<ClientToServerEvents, ServerToClientEvents>['on']>[1]>[0]
    : never;

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.appUrl,
      credentials: true,
    },
  });

  // Namespaces
  const dashboard = io.of('/dashboard');
  const play = io.of('/play');
  const overlay = io.of('/overlay');

  // Auth middleware for dashboard (requires login)
  dashboard.use(socketAuthMiddleware);

  // Play and overlay are public (viewers don't need auth)
  play.use((_socket, next) => next());
  overlay.use((_socket, next) => next());

  // Register handlers
  dashboard.on('connection', (socket) => {
    console.log(`Dashboard client connected: ${socket.id}`);
    registerGameHandlers(socket, io);
    registerVoteHandlers(socket, io);

    socket.on('disconnect', () => {
      console.log(`Dashboard client disconnected: ${socket.id}`);
    });
  });

  play.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    registerVoteHandlers(socket, io);

    socket.on('session:join', (sessionId) => {
      socket.join(sessionId);
      console.log(`Player ${socket.id} joined session ${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
    });
  });

  overlay.on('connection', (socket) => {
    console.log(`Overlay connected: ${socket.id}`);

    socket.on('session:join', (sessionId) => {
      socket.join(sessionId);
      console.log(`Overlay ${socket.id} joined session ${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Overlay disconnected: ${socket.id}`);
    });
  });

  return io;
}
