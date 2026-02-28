import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/client.js';
import { gameRegistry } from '../engine/GameRegistry.js';
import { logger } from '../logger.js';
import type { ResponseSource } from '@twitch-hub/shared-types';

const log = logger.child({ module: 'vote-service' });

interface VoteInput {
  sessionId: string;
  userId?: string;
  twitchLogin?: string;
  answer: unknown;
  source: ResponseSource;
}

export class VoteService {
  async submitVote(input: VoteInput): Promise<boolean> {
    const { sessionId, userId, twitchLogin, answer, source } = input;

    const engine = gameRegistry.getEngine(sessionId);
    if (!engine) {
      throw new Error('No active session');
    }

    const state = engine.getState();
    if (state.status !== 'LIVE') {
      throw new Error('Session is not active');
    }

    const voterId = userId || twitchLogin || 'anonymous';
    const roundData = state.roundData;
    const questionId = roundData?.questionId || `round-${state.currentRound}`;

    // Process through the game engine (handles deduplication internally)
    await engine.onAnswer(voterId, answer, questionId);

    // Persist to DB asynchronously (fire and forget)
    this.persistResponse({
      sessionId,
      userId: userId || null,
      twitchLogin: twitchLogin || null,
      round: state.currentRound,
      questionId,
      answer,
      source,
    }).catch((err) => log.error({ err, sessionId }, 'Failed to persist response'));

    return true;
  }

  private async persistResponse(data: {
    sessionId: string;
    userId: string | null;
    twitchLogin: string | null;
    round: number;
    questionId: string;
    answer: unknown;
    source: string;
  }) {
    try {
      await prisma.response.create({
        data: {
          sessionId: data.sessionId,
          userId: data.userId,
          twitchLogin: data.twitchLogin,
          round: data.round,
          questionId: data.questionId,
          answer: data.answer as object,
          source: data.source as 'WEB' | 'CHAT',
        },
      });
    } catch (err: unknown) {
      // Unique constraint violation = duplicate vote, expected
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return;
      }
      throw err;
    }
  }
}

export const voteService = new VoteService();
