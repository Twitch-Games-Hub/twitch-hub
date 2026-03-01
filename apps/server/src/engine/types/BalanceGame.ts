import {
  GameType,
  type BalanceConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine, REDIS_VOTE_TTL_SEC } from '../GameEngine.js';
import { redis } from '../../db/redis.js';

export class BalanceGame extends GameEngine<BalanceConfig, string> {
  getGameType() {
    return GameType.BALANCE;
  }

  getTotalRounds(): number {
    return this.config.questions.length;
  }

  getRoundData(round: number): RoundData {
    const q = this.config.questions[round - 1];
    return {
      round,
      questionId: `balance-${round - 1}`,
      prompt: `${q.optionA} vs ${q.optionB}`,
      options: [q.optionA, q.optionB],
      optionImages: [q.imageUrlA ?? null, q.imageUrlB ?? null],
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    const q = this.config.questions[this.currentRound - 1];
    if (!q) return;

    const isA = answer === 'A' || answer === q.optionA;
    const isB = answer === 'B' || answer === q.optionB;
    if (!isA && !isB) return;

    const bucket = isA ? '0' : '1';
    const recorded = await this.recordVote(userId, questionId, bucket);

    // Track per-user vote choice for majority voter tracking
    if (recorded) {
      const userVoteKey = `session:${this.sessionId}:uservotes:${questionId}`;
      await redis.hset(userVoteKey, userId, bucket);
      await redis.expire(userVoteKey, REDIS_VOTE_TTL_SEC);
    }
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `balance-${round - 1}`;
    const [a, b] = await this.getBinaryDistribution(questionId);
    const total = a + b;

    // Gamification: award majority voter XP
    if (this.gamificationService && total > 0) {
      const winnerBucket = a >= b ? '0' : '1';
      const userVoteKey = `session:${this.sessionId}:uservotes:${questionId}`;
      const allVotes = await redis.hgetall(userVoteKey);
      const majorityVoterIds = Object.entries(allVotes)
        .filter(([, bucket]) => bucket === winnerBucket)
        .map(([userId]) => userId);
      if (majorityVoterIds.length > 0) {
        this.gamificationService
          .recordMajorityVoters(this.sessionId, majorityVoterIds)
          .catch(() => {});
      }
    }

    return {
      round,
      questionId,
      distribution: [a, b],
      percentages: { A: total ? (a / total) * 100 : 0, B: total ? (b / total) * 100 : 0 },
      totalResponses: total,
    };
  }

  async computeFinalResults(): Promise<FinalResults> {
    return {
      sessionId: this.sessionId,
      rounds: this.roundResults,
      totalParticipants: this.participantIds.size,
    };
  }

  protected getRoundDurationMs(): number {
    return (this.config.roundDurationSec ?? 0) * 1000;
  }

  protected async getDistribution(questionId: string): Promise<number[]> {
    return this.getBinaryDistribution(questionId);
  }
}
