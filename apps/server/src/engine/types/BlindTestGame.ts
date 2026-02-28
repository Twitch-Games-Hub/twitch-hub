import {
  GameType,
  type BlindTestConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

export class BlindTestGame extends GameEngine<BlindTestConfig, string> {
  getGameType() {
    return GameType.BLIND_TEST;
  }

  getTotalRounds(): number {
    return this.config.rounds.length;
  }

  getRoundData(round: number): RoundData {
    const r = this.config.rounds[round - 1];
    return {
      round,
      questionId: `blind-${round - 1}`,
      prompt: r.hints[0] || 'Guess the answer!',
      endsAt: new Date(Date.now() + this.config.answerWindowSec * 1000).toISOString(),
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    const roundIdx = parseInt(questionId.replace('blind-', ''), 10);
    const correctAnswer = this.config.rounds[roundIdx]?.answer?.toLowerCase();
    if (answer.toLowerCase().trim() === correctAnswer) {
      const { redis } = await import('../../db/redis.js');
      // Track correct answers for leaderboard
      await redis.zincrby(`session:${this.sessionId}:leaderboard`, 1, userId);
    }
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    return { round, questionId: `blind-${round - 1}`, totalResponses: 0 };
  }

  async computeFinalResults(): Promise<FinalResults> {
    return {
      sessionId: this.sessionId,
      rounds: this.roundResults,
      totalParticipants: this.participantIds.size,
    };
  }
}
