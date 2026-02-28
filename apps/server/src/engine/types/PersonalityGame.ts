import {
  GameType,
  type PersonalityConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

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
    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    const { redis } = await import('../../db/redis.js');
    await redis.hincrby(this.voteKey(questionId), String(answer), 1);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    return { round, questionId: `personality-${round - 1}`, totalResponses: 0 };
  }

  async computeFinalResults(): Promise<FinalResults> {
    return {
      sessionId: this.sessionId,
      rounds: this.roundResults,
      totalParticipants: this.participantIds.size,
    };
  }
}
