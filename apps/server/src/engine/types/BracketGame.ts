import {
  GameType,
  type BracketConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

export class BracketGame extends GameEngine<BracketConfig, string> {
  private matchups: [string, string][] = [];
  private currentMatchupIndex = 0;

  getGameType() {
    return GameType.BRACKET;
  }

  getTotalRounds(): number {
    return Math.ceil(Math.log2(this.config.bracketSize));
  }

  getRoundData(round: number): RoundData {
    return {
      round,
      questionId: `matchup-${this.currentMatchupIndex}`,
      prompt: `${this.matchups[this.currentMatchupIndex]?.[0]} vs ${this.matchups[this.currentMatchupIndex]?.[1]}`,
      options: this.matchups[this.currentMatchupIndex]
        ? [...this.matchups[this.currentMatchupIndex]]
        : [],
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    const bucket = answer === 'A' ? '0' : '1';
    const { redis } = await import('../../db/redis.js');
    await redis.hincrby(this.voteKey(questionId), bucket, 1);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    return { round, questionId: `matchup-${this.currentMatchupIndex}`, totalResponses: 0 };
  }

  async computeFinalResults(): Promise<FinalResults> {
    return {
      sessionId: this.sessionId,
      rounds: this.roundResults,
      totalParticipants: this.participantIds.size,
    };
  }
}
