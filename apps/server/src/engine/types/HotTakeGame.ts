import {
  GameType,
  type HotTakeConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine, REDIS_VOTE_TTL_SEC } from '../GameEngine.js';
import { redis } from '../../db/redis.js';

export class HotTakeGame extends GameEngine<HotTakeConfig, number> {
  getGameType() {
    return GameType.HOT_TAKE;
  }

  getTotalRounds(): number {
    return this.config.statements.length;
  }

  protected getRoundDurationMs(): number {
    return (this.config.roundDurationSec || 0) * 1000;
  }

  getRoundData(round: number): RoundData {
    const idx = round - 1;
    return {
      round,
      questionId: `statement-${idx}`,
      prompt: this.config.statements[idx],
    };
  }

  async processAnswer(userId: string, answer: number, questionId: string): Promise<void> {
    // Validate rating is 1-10
    const rating = Math.round(Number(answer));
    if (rating < 1 || rating > 10 || isNaN(rating)) {
      throw new Error('Rating must be between 1 and 10');
    }

    // Increment the bucket in Redis (0-indexed: bucket 0 = rating 1)
    const recorded = await this.recordVote(userId, questionId, String(rating - 1));

    // Track per-user vote for majority voter tracking
    if (recorded) {
      const userVoteKey = `session:${this.sessionId}:uservotes:${questionId}`;
      await redis.hset(userVoteKey, userId, String(rating - 1));
      await redis.expire(userVoteKey, REDIS_VOTE_TTL_SEC);
    }
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `statement-${round - 1}`;
    const distribution = await this.getDistribution(questionId);
    const totalResponses = distribution.reduce((sum, n) => sum + n, 0);

    // Gamification: award majority voter XP to peak bucket voters
    if (this.gamificationService && totalResponses > 0) {
      const peakBucket = String(distribution.indexOf(Math.max(...distribution)));
      const userVoteKey = `session:${this.sessionId}:uservotes:${questionId}`;
      const allVotes = await redis.hgetall(userVoteKey);
      const peakVoterIds = Object.entries(allVotes)
        .filter(([, bucket]) => bucket === peakBucket)
        .map(([userId]) => userId);
      if (peakVoterIds.length > 0) {
        this.gamificationService.recordMajorityVoters(this.sessionId, peakVoterIds).catch(() => {});
      }
    }

    return {
      round,
      questionId,
      distribution,
      totalResponses,
    };
  }

  async computeFinalResults(): Promise<FinalResults> {
    return {
      sessionId: this.sessionId,
      rounds: this.roundResults,
      totalParticipants: this.participantIds.size,
    };
  }
}
