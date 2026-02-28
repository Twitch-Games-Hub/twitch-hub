import {
  GameType,
  type HotTakeConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

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
    await this.recordVote(userId, questionId, String(rating - 1));
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `statement-${round - 1}`;
    const distribution = await this.getDistribution(questionId);
    const totalResponses = distribution.reduce((sum, n) => sum + n, 0);

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
