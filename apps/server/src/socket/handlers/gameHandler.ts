import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { SessionStatus } from '@twitch-hub/shared-types';
import * as Sentry from '@sentry/node';
import { gameRegistry } from '../../engine/GameRegistry.js';
import { prisma } from '../../db/client.js';
import { logger } from '../../logger.js';
import { requireHost } from '../helpers.js';
import { getUsers } from '../sessionUsers.js';
import { computeSessionBudget, consumeCredit } from '../../middleware/sessionBudget.js';
import { trackEvent } from '../../services/sentryAnalytics.js';
import { gamificationService } from '../../services/GamificationService.js';
import { redis } from '../../db/redis.js';

const log = logger.child({ module: 'game' });

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerGameHandlers(socket: AppSocket, io: AppServer) {
  socket.on('game:create-session', async (rawData) => {
    // Support both legacy (string) and new ({ gameId, onBehalfOf? }) format
    const data = rawData as string | { gameId: string; onBehalfOf?: string };
    const gameId = typeof data === 'string' ? data : data.gameId;
    const onBehalfOf = typeof data === 'string' ? undefined : data.onBehalfOf;

    try {
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      // Determine the effective host (streamer) for this session
      let hostId = socket.data.userId;
      let channelId = socket.data.twitchId || '';

      if (onBehalfOf) {
        // Verify mod authorization for the streamer
        const modUser = await prisma.user.findUnique({
          where: { id: socket.data.userId },
          select: { twitchId: true },
        });
        if (!modUser) {
          socket.emit('error', 'User not found');
          return;
        }

        const link = await prisma.moderatorLink.findFirst({
          where: { streamerId: onBehalfOf, modTwitchId: modUser.twitchId, enabled: true },
        });
        if (!link) {
          socket.emit('error', 'Not authorized as moderator for this streamer');
          return;
        }

        // Verify the game belongs to the streamer
        if (game.ownerId !== onBehalfOf) {
          socket.emit('error', 'Game does not belong to this streamer');
          return;
        }

        const streamer = await prisma.user.findUnique({
          where: { id: onBehalfOf },
          select: { twitchId: true },
        });
        hostId = onBehalfOf;
        channelId = streamer?.twitchId || '';
      }

      // Check session budget for the host (streamer)
      const budget = await computeSessionBudget(hostId);
      if (!budget.canCreateSession) {
        socket.emit('error', 'Session limit reached. Upgrade your plan or purchase credits.');
        return;
      }

      // Prevent duplicate active sessions
      const existing = await prisma.gameSession.findFirst({
        where: {
          gameId,
          hostId,
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
          hostId,
          channelId,
          state: {},
        },
      });

      // Consume a credit if that was the budget source
      if (budget.source === 'credits') {
        await consumeCredit(hostId);
      }

      socket.join(session.id);
      socket.emit('session:created', { sessionId: session.id });

      // Initialize game engine with host tracking
      await gameRegistry.initSession(session.id, game, hostId, channelId);
      trackEvent(socket.data.userId, 'game_session_created', {
        sessionId: session.id,
        gameId,
        onBehalfOf,
      });
      log.info(
        { sessionId: session.id, gameId, userId: socket.data.userId, onBehalfOf },
        'Session created',
      );
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

      trackEvent(socket.data.userId, 'game_started', { sessionId });
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

      const leaderboard = await gamificationService.getSessionLeaderboard(sessionId);
      io.of('/play').to(sessionId).emit('leaderboard:update', leaderboard);

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
      const channelId = gameRegistry.getChannelId(sessionId) ?? '';

      const finalResults = await engine.end();

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'ENDED', endedAt: new Date(), state: finalResults as object },
      });

      broadcastToSession(io, sessionId, 'game:ended', finalResults);

      const finalLeaderboard = await gamificationService.getSessionLeaderboard(sessionId, 20);
      io.of('/play').to(sessionId).emit('leaderboard:update', finalLeaderboard);

      // Emit per-player XP summary to each connected play socket
      try {
        const playSockets = await io.of('/play').in(sessionId).fetchSockets();
        for (const s of playSockets) {
          const playerId =
            s.data.userId || (s.data.anonId ? `anon-${s.data.anonId}` : `anon-${s.id}`);
          const key = `session:${sessionId}:xp:${playerId}`;
          const hash = await redis.hgetall(key);
          if (Object.keys(hash).length > 0) {
            const breakdown: Record<string, number> = {};
            let total = 0;
            for (const [reason, amount] of Object.entries(hash)) {
              const xp = parseInt(amount, 10);
              breakdown[reason] = xp;
              total += xp;
            }
            s.emit('gamification:session-summary', { breakdown, total });
          }
        }
      } catch (err) {
        log.error({ err, sessionId }, 'Failed to emit session XP summaries');
      }

      // Finalize gamification (fire-and-forget)
      gamificationService
        .finalizeSession(
          sessionId,
          channelId,
          [...engine.getParticipantIds()],
          engine.getTotalRoundsCount(),
        )
        .catch((err) => log.error({ err, sessionId }, 'Gamification finalize failed'));

      gameRegistry.removeEngine(sessionId);

      trackEvent(socket.data.userId, 'game_ended', { sessionId });
      log.info({ sessionId, userId: socket.data.userId }, 'Game ended');
    }, 'game:end')(socket, sessionId),
  );

  socket.on('session:rejoin', async ({ sessionId }) => {
    try {
      // First try as host
      let session = await prisma.gameSession.findFirst({
        where: {
          id: sessionId,
          hostId: socket.data.userId,
          status: { in: ['LOBBY', 'LIVE'] },
        },
        include: { game: true },
      });

      // If not host, check if authorized mod
      if (!session) {
        const modUser = await prisma.user.findUnique({
          where: { id: socket.data.userId },
          select: { twitchId: true },
        });

        if (modUser) {
          const candidateSession = await prisma.gameSession.findFirst({
            where: {
              id: sessionId,
              status: { in: ['LOBBY', 'LIVE'] },
            },
            include: { game: true },
          });

          if (candidateSession) {
            const link = await prisma.moderatorLink.findFirst({
              where: {
                streamerId: candidateSession.hostId,
                modTwitchId: modUser.twitchId,
                enabled: true,
              },
            });
            if (link) {
              session = candidateSession;
            }
          }
        }
      }

      if (!session) {
        socket.emit('error', 'No active session found');
        return;
      }

      socket.join(session.id);

      // Re-init engine if missing (e.g. after server restart)
      let engine = gameRegistry.getEngine(session.id);
      if (!engine) {
        engine = await gameRegistry.initSession(
          session.id,
          session.game,
          session.hostId,
          session.channelId,
        );
        if (session.status === 'LIVE') {
          engine.restoreState(session.currentRound, SessionStatus.LIVE);
        }
      }

      const snapshot = await engine.getSnapshot(session.id);
      socket.emit('session:rejoined', snapshot);
      socket.emit('session:users', getUsers(session.id));

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
