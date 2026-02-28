import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import * as Sentry from '@sentry/node';
import { gameRegistry } from '../../engine/GameRegistry.js';
import { logger } from '../../logger.js';

const log = logger.child({ module: 'vote' });

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const VOTE_COOLDOWN_MS = 200;

export function registerVoteHandlers(socket: AppSocket, _io: AppServer) {
  let lastVoteAt = 0;

  socket.on('response:submit', async ({ sessionId, questionId, answer }) => {
    try {
      // Per-socket rate limit
      const now = Date.now();
      if (now - lastVoteAt < VOTE_COOLDOWN_MS) return;
      lastVoteAt = now;

      const engine = gameRegistry.getEngine(sessionId);
      if (!engine) {
        socket.emit('error', 'Session not found');
        return;
      }

      const userId =
        socket.data.userId ||
        (socket.data.anonId ? `anon-${socket.data.anonId}` : `anon-${socket.id}`);
      await engine.onAnswer(userId, answer, questionId);
      socket.emit('response:ack', { questionId });
    } catch (err) {
      socket.emit('error', 'Failed to submit response');
      log.error({ err, sessionId, socketId: socket.id }, 'response:submit error');
      Sentry.captureException(err, {
        tags: { handler: 'response:submit' },
        extra: { sessionId, socketId: socket.id },
      });
    }
  });
}
