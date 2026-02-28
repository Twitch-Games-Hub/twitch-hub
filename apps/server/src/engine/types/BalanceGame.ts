import {
  GameType,
  type BalanceConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';
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
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    const bucket =
      answer === 'A' || answer === this.config.questions[this.currentRound - 1]?.optionA
        ? '0'
        : '1';
    await redis.hincrby(this.voteKey(questionId), bucket, 1);
    await redis.expire(this.voteKey(questionId), 3600);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `balance-${round - 1}`;
    const values = await redis.hgetall(this.voteKey(questionId));
    const a = parseInt(values['0'] || '0', 10);
    const b = parseInt(values['1'] || '0', 10);
    const total = a + b;
    return {
      round,
      questionId,
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

  protected async getDistribution(questionId: string): Promise<number[]> {
    const values = await redis.hgetall(this.voteKey(questionId));
    return [parseInt(values['0'] || '0', 10), parseInt(values['1'] || '0', 10)];
  }
}
