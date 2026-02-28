import {
  GameType,
  type PersonalityConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';
import { redis } from '../../db/redis.js';

export class PersonalityGame extends GameEngine<PersonalityConfig, number> {
  getGameType() {
    return GameType.PERSONALITY;
  }

  getTotalRounds(): number {
    return this.config.questions.length;
  }

  getRoundData(round: number): RoundData {
    const q = this.config.questions[round - 1];
    return {
      round,
      questionId: `personality-${round - 1}`,
      prompt: q.text,
      options: q.options.map((o) => o.label),
    };
  }

  async processAnswer(userId: string, answer: number, questionId: string): Promise<void> {
    const q = this.config.questions[this.currentRound - 1];
    if (!q) return;

    const idx = Math.round(Number(answer));
    if (isNaN(idx) || idx < 0 || idx >= q.options.length) return;

    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    await redis.hincrby(this.voteKey(questionId), String(idx), 1);
    await redis.expire(this.voteKey(questionId), 3600);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `personality-${round - 1}`;
    const q = this.config.questions[round - 1];
    const values = await redis.hgetall(this.voteKey(questionId));
    const distribution: number[] = new Array(q.options.length).fill(0);
    for (const [bucket, count] of Object.entries(values)) {
      const idx = parseInt(bucket, 10);
      if (idx >= 0 && idx < q.options.length) {
        distribution[idx] = parseInt(count, 10);
      }
    }
    const total = distribution.reduce((sum, n) => sum + n, 0);
    return {
      round,
      questionId,
      distribution,
      totalResponses: total,
    };
  }

  async computeFinalResults(): Promise<FinalResults> {
    // Aggregate weighted scores across all rounds to determine personality type distribution
    const scores: Record<string, number> = {};
    for (const rt of this.config.resultTypes) {
      scores[rt.id] = 0;
    }

    for (let roundIdx = 0; roundIdx < this.config.questions.length; roundIdx++) {
      const questionId = `personality-${roundIdx}`;
      const values = await redis.hgetall(this.voteKey(questionId));
      const q = this.config.questions[roundIdx];

      for (const [bucket, count] of Object.entries(values)) {
        const optionIdx = parseInt(bucket, 10);
        const voteCount = parseInt(count, 10);
        if (optionIdx >= 0 && optionIdx < q.options.length) {
          const weights = q.options[optionIdx].weight;
          for (const [resultType, weight] of Object.entries(weights)) {
            scores[resultType] = (scores[resultType] || 0) + weight * voteCount;
          }
        }
      }
    }

    // Include personality type distribution in finalResults via the last round's results
    const finalRounds = [...this.roundResults];
    if (finalRounds.length > 0) {
      finalRounds[finalRounds.length - 1] = {
        ...finalRounds[finalRounds.length - 1],
        percentages: scores,
      };
    }

    return {
      sessionId: this.sessionId,
      rounds: finalRounds,
      totalParticipants: this.participantIds.size,
      finalResults: scores,
    } as FinalResults;
  }

  protected async getDistribution(questionId: string): Promise<number[]> {
    const roundIdx = parseInt(questionId.replace('personality-', ''), 10);
    const q = this.config.questions[roundIdx];
    const optionCount = q ? q.options.length : 4;
    const values = await redis.hgetall(this.voteKey(questionId));
    const dist: number[] = new Array(optionCount).fill(0);
    for (const [bucket, count] of Object.entries(values)) {
      const idx = parseInt(bucket, 10);
      if (idx >= 0 && idx < optionCount) {
        dist[idx] = parseInt(count, 10);
      }
    }
    return dist;
  }
}
