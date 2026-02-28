import {
  GameType,
  type BalanceConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

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
    await this.recordVote(userId, questionId, bucket);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `balance-${round - 1}`;
    const [a, b] = await this.getBinaryDistribution(questionId);
    const total = a + b;
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
