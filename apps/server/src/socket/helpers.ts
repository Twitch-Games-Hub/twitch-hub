import type { Socket } from 'socket.io';
import {
  SessionStatus,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type FinalResults,
  type GameType,
} from '@twitch-hub/shared-types';
import * as Sentry from '@sentry/node';
import { prisma } from '../db/client.js';
import { gameRegistry } from '../engine/GameRegistry.js';
import type { Logger } from 'pino';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function requireHost(
  handler: (socket: AppSocket, sessionId: string) => Promise<void>,
  handlerName: string,
) {
  return async (socket: AppSocket, sessionId: string) => {
    try {
      const authorized = await gameRegistry.isAuthorized(sessionId, socket.data.userId);
      if (!authorized) {
        socket.emit('error', 'Not authorized');
        return;
      }

      const engine = gameRegistry.getEngine(sessionId);
      if (!engine) {
        socket.emit('error', 'Session not found');
        return;
      }

      await handler(socket, sessionId);
    } catch (err) {
      socket.emit('error', `Failed to ${handlerName}`);
      Sentry.captureException(err, {
        tags: { handler: handlerName },
        extra: { sessionId, userId: socket.data.userId },
      });
    }
  };
}

async function validateSession(
  sessionId: string,
): Promise<{ exists: false } | { exists: true; status: string }> {
  if (!sessionId || typeof sessionId !== 'string') return { exists: false };
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });
  if (!session) return { exists: false };
  return { exists: true, status: session.status };
}

export function createSessionJoinHandler(log: Logger) {
  return async (socket: AppSocket, sessionId: string) => {
    const result = await validateSession(sessionId);
    if (!result.exists) {
      log.warn({ socketId: socket.id, sessionId }, 'Tried to join invalid session');
      socket.emit('error', 'Session not found');
      return;
    }

    const engine = gameRegistry.getEngine(sessionId);

    if (result.status === 'ENDED' && !engine) {
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        select: { state: true, currentRound: true, game: { select: { type: true } } },
      });
      const finalResults = session?.state as FinalResults | null;

      if (!session || !finalResults?.sessionId) {
        log.debug({ socketId: socket.id, sessionId }, 'Ended session with no persisted results');
        socket.emit('error', 'Session has ended');
        return;
      }

      socket.join(sessionId);
      socket.emit('session:rejoined', {
        sessionId,
        gameState: {
          sessionId,
          gameType: session.game.type as GameType,
          status: SessionStatus.ENDED,
          currentRound: session.currentRound,
          totalRounds: finalResults.rounds.length,
          participantCount: finalResults.totalParticipants,
        },
        currentRound: null,
        votes: null,
        participantCount: finalResults.totalParticipants,
        finalResults,
      });
      return;
    }

    socket.join(sessionId);
    log.debug({ socketId: socket.id, sessionId }, 'Joined session');

    if (engine) {
      const snapshot = await engine.getSnapshot(sessionId);
      socket.emit('session:rejoined', snapshot);
    }
  };
}

export function registerSocketLifecycleHandlers(socket: AppSocket, log: Logger, namespace: string) {
  socket.on('error', (err) => {
    log.error({ err, socketId: socket.id }, `${namespace} socket error`);
    Sentry.captureException(err, {
      tags: { namespace },
      extra: { socketId: socket.id },
    });
  });

  socket.on('disconnect', () => {
    log.debug({ socketId: socket.id }, `${namespace} client disconnected`);
  });
}
