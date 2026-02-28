import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { gameRegistry } from '../../engine/GameRegistry.js';
import { prisma } from '../../db/client.js';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerGameHandlers(socket: AppSocket, io: AppServer) {
  socket.on('game:create-session', async (gameId) => {
    try {
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      const session = await prisma.gameSession.create({
        data: {
          gameId: game.id,
          hostId: socket.data.userId,
          channelId: socket.data.twitchId || '',
          state: {},
        },
      });

      socket.join(session.id);
      socket.emit('session:created', { sessionId: session.id });

      // Initialize game engine
      await gameRegistry.initSession(session.id, game);
    } catch (err) {
      socket.emit('error', 'Failed to create session');
      console.error('game:create-session error:', err);
    }
  });

  socket.on('game:start', async (sessionId) => {
    try {
      const engine = gameRegistry.getEngine(sessionId);
      if (!engine) {
        socket.emit('error', 'Session not found');
        return;
      }

      const state = await engine.start();

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'ACTIVE', startedAt: new Date() },
      });

      // Broadcast to all namespaces
      broadcastToSession(io, sessionId, 'game:state', state);

      // Start first round
      const roundData = await engine.startRound();
      broadcastToSession(io, sessionId, 'game:round-start', roundData);
    } catch (err) {
      socket.emit('error', 'Failed to start game');
      console.error('game:start error:', err);
    }
  });

  socket.on('game:next-round', async (sessionId) => {
    try {
      const engine = gameRegistry.getEngine(sessionId);
      if (!engine) {
        socket.emit('error', 'Session not found');
        return;
      }

      // End current round
      const results = await engine.endRound();
      broadcastToSession(io, sessionId, 'game:round-end', results);

      // Start next round
      const roundData = await engine.startRound();
      if (roundData) {
        broadcastToSession(io, sessionId, 'game:round-start', roundData);
        broadcastToSession(io, sessionId, 'game:state', engine.getState());
      }
    } catch (err) {
      socket.emit('error', 'Failed to advance round');
      console.error('game:next-round error:', err);
    }
  });

  socket.on('game:end', async (sessionId) => {
    try {
      const engine = gameRegistry.getEngine(sessionId);
      if (!engine) {
        socket.emit('error', 'Session not found');
        return;
      }

      const finalResults = await engine.end();

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });

      broadcastToSession(io, sessionId, 'game:ended', finalResults);
      gameRegistry.removeEngine(sessionId);
    } catch (err) {
      socket.emit('error', 'Failed to end game');
      console.error('game:end error:', err);
    }
  });
}

function broadcastToSession(io: AppServer, sessionId: string, event: string, data: unknown) {
  io.of('/dashboard').to(sessionId).emit(event as keyof ServerToClientEvents, data as never);
  io.of('/play').to(sessionId).emit(event as keyof ServerToClientEvents, data as never);
  io.of('/overlay').to(sessionId).emit(event as keyof ServerToClientEvents, data as never);
}
