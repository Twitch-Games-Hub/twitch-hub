import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { SessionStatus } from '@twitch-hub/shared-types';
import { gameRegistry } from '../../engine/GameRegistry.js';
import { prisma } from '../../db/client.js';
import { logger } from '../../logger.js';

const log = logger.child({ module: 'game' });

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

      // Prevent duplicate active sessions
      const existing = await prisma.gameSession.findFirst({
        where: {
          gameId,
          hostId: socket.data.userId,
          status: { in: ['WAITING', 'ACTIVE'] },
        },
      });
      if (existing) {
        socket.emit('error', 'A live session already exists for this game. Reload to rejoin.');
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

      // Initialize game engine with host tracking
      await gameRegistry.initSession(session.id, game, socket.data.userId);
      log.info({ sessionId: session.id, gameId, userId: socket.data.userId }, 'Session created');
    } catch (err) {
      socket.emit('error', 'Failed to create session');
      log.error({ err, gameId, userId: socket.data.userId }, 'game:create-session error');
    }
  });

  socket.on('game:start', async (sessionId) => {
    try {
      if (!gameRegistry.isHost(sessionId, socket.data.userId)) {
        socket.emit('error', 'Not authorized');
        return;
      }

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

      // Persist current round for recovery
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { currentRound: engine.getState().currentRound },
      });

      log.info({ sessionId, userId: socket.data.userId }, 'Game started');
    } catch (err) {
      socket.emit('error', 'Failed to start game');
      log.error({ err, sessionId, userId: socket.data.userId }, 'game:start error');
    }
  });

  socket.on('game:next-round', async (sessionId) => {
    try {
      if (!gameRegistry.isHost(sessionId, socket.data.userId)) {
        socket.emit('error', 'Not authorized');
        return;
      }

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

        // Persist current round for recovery
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { currentRound: engine.getState().currentRound },
        });
      }

      log.info({ sessionId, userId: socket.data.userId }, 'Round advanced');
    } catch (err) {
      socket.emit('error', 'Failed to advance round');
      log.error({ err, sessionId, userId: socket.data.userId }, 'game:next-round error');
    }
  });

  socket.on('game:end', async (sessionId) => {
    try {
      if (!gameRegistry.isHost(sessionId, socket.data.userId)) {
        socket.emit('error', 'Not authorized');
        return;
      }

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

      log.info({ sessionId, userId: socket.data.userId }, 'Game ended');
    } catch (err) {
      socket.emit('error', 'Failed to end game');
      log.error({ err, sessionId, userId: socket.data.userId }, 'game:end error');
    }
  });

  socket.on('session:rejoin', async ({ gameId }) => {
    try {
      // Find active session for this game + host
      const session = await prisma.gameSession.findFirst({
        where: {
          gameId,
          hostId: socket.data.userId,
          status: { in: ['WAITING', 'ACTIVE'] },
        },
        include: { game: true },
      });

      if (!session) {
        socket.emit('error', 'No active session found');
        return;
      }

      socket.join(session.id);

      // Re-init engine if missing (e.g. after server restart)
      let engine = gameRegistry.getEngine(session.id);
      if (!engine) {
        engine = await gameRegistry.initSession(session.id, session.game, socket.data.userId);
        if (session.status === 'ACTIVE') {
          engine.restoreState(session.currentRound, SessionStatus.ACTIVE);
        }
      }

      const snapshot = await engine.getSnapshot(session.id);
      socket.emit('session:rejoined', snapshot);

      log.info({ sessionId: session.id, gameId, userId: socket.data.userId }, 'Session rejoined');
    } catch (err) {
      socket.emit('error', 'Failed to rejoin session');
      log.error({ err, gameId, userId: socket.data.userId }, 'session:rejoin error');
    }
  });
}

function broadcastToSession(io: AppServer, sessionId: string, event: string, data: unknown) {
  io.of('/dashboard')
    .to(sessionId)
    .emit(event as keyof ServerToClientEvents, data as never);
  io.of('/play')
    .to(sessionId)
    .emit(event as keyof ServerToClientEvents, data as never);
  io.of('/overlay')
    .to(sessionId)
    .emit(event as keyof ServerToClientEvents, data as never);
}
