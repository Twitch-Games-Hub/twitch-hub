import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { SessionStatus } from '@twitch-hub/shared-types';
import * as Sentry from '@sentry/node';
import { gameRegistry } from '../../engine/GameRegistry.js';
import { prisma } from '../../db/client.js';
import { logger } from '../../logger.js';
import { requireHost } from '../helpers.js';
import { computeSessionBudget, consumeCredit } from '../../middleware/sessionBudget.js';

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

      // Check session budget
      const budget = await computeSessionBudget(socket.data.userId);
      if (!budget.canCreateSession) {
        socket.emit('error', 'Session limit reached. Upgrade your plan or purchase credits.');
        return;
      }

      // Prevent duplicate active sessions
      const existing = await prisma.gameSession.findFirst({
        where: {
          gameId,
          hostId: socket.data.userId,
          status: { in: ['LOBBY', 'LIVE'] },
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

      // Consume a credit if that was the budget source
      if (budget.source === 'credits') {
        await consumeCredit(socket.data.userId);
      }

      socket.join(session.id);
      socket.emit('session:created', { sessionId: session.id });

      // Initialize game engine with host tracking
      await gameRegistry.initSession(session.id, game, socket.data.userId);
      log.info({ sessionId: session.id, gameId, userId: socket.data.userId }, 'Session created');
    } catch (err) {
      socket.emit('error', 'Failed to create session');
      log.error({ err, gameId, userId: socket.data.userId }, 'game:create-session error');
      Sentry.captureException(err, {
        tags: { handler: 'game:create-session' },
        extra: { gameId, userId: socket.data.userId },
      });
    }
  });

  socket.on('game:start', (sessionId) =>
    requireHost(async (socket, sessionId) => {
      const engine = gameRegistry.getEngine(sessionId)!;

      const state = await engine.start();

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'LIVE', startedAt: new Date() },
      });

      broadcastToSession(io, sessionId, 'game:state', state);

      const roundData = await engine.startRound();
      broadcastToSession(io, sessionId, 'game:round-start', roundData);

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { currentRound: engine.getState().currentRound },
      });

      log.info({ sessionId, userId: socket.data.userId }, 'Game started');
    }, 'game:start')(socket, sessionId),
  );

  socket.on('game:next-round', (sessionId) =>
    requireHost(async (socket, sessionId) => {
      const engine = gameRegistry.getEngine(sessionId)!;
      const state = engine.getState();

      if (state.currentRound >= state.totalRounds) {
        log.warn({ sessionId }, 'next-round rejected: already at last round');
        return;
      }

      const results = await engine.endRound();
      broadcastToSession(io, sessionId, 'game:round-end', results);

      const roundData = await engine.startRound();
      if (roundData) {
        broadcastToSession(io, sessionId, 'game:round-start', roundData);
        broadcastToSession(io, sessionId, 'game:state', engine.getState());

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { currentRound: engine.getState().currentRound },
        });
      }

      log.info({ sessionId, userId: socket.data.userId }, 'Round advanced');
    }, 'game:next-round')(socket, sessionId),
  );

  socket.on('game:end', (sessionId) =>
    requireHost(async (socket, sessionId) => {
      const engine = gameRegistry.getEngine(sessionId)!;

      const finalResults = await engine.end();

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'ENDED', endedAt: new Date(), state: finalResults as object },
      });

      broadcastToSession(io, sessionId, 'game:ended', finalResults);
      gameRegistry.removeEngine(sessionId);

      log.info({ sessionId, userId: socket.data.userId }, 'Game ended');
    }, 'game:end')(socket, sessionId),
  );

  socket.on('session:rejoin', async ({ sessionId }) => {
    try {
      // Find session by PK + host ownership
      const session = await prisma.gameSession.findFirst({
        where: {
          id: sessionId,
          hostId: socket.data.userId,
          status: { in: ['LOBBY', 'LIVE'] },
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
        if (session.status === 'LIVE') {
          engine.restoreState(session.currentRound, SessionStatus.LIVE);
        }
      }

      const snapshot = await engine.getSnapshot(session.id);
      socket.emit('session:rejoined', snapshot);

      log.info({ sessionId, userId: socket.data.userId }, 'Session rejoined');
    } catch (err) {
      socket.emit('error', 'Failed to rejoin session');
      log.error({ err, sessionId, userId: socket.data.userId }, 'session:rejoin error');
      Sentry.captureException(err, {
        tags: { handler: 'session:rejoin' },
        extra: { sessionId, userId: socket.data.userId },
      });
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
