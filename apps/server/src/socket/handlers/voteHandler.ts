import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { gameRegistry } from '../../engine/GameRegistry.js';

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

      const userId = socket.data.userId || `anon-${socket.id}`;
      await engine.onAnswer(userId, answer, questionId);
    } catch (err) {
      socket.emit('error', 'Failed to submit response');
      console.error('response:submit error:', err);
    }
  });
}
