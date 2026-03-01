import {
  GameType,
  type BlindTestConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';
import { leaderboardService } from '../../services/LeaderboardService.js';
import { redis } from '../../db/redis.js';

export class BlindTestGame extends GameEngine<BlindTestConfig, string> {
  private roundStartedAt = Date.now();

  getGameType() {
    return GameType.BLIND_TEST;
  }

  getTotalRounds(): number {
    return this.config.rounds.length;
  }

  getRoundData(round: number): RoundData {
    this.roundStartedAt = Date.now();
    const r = this.config.rounds[round - 1];
    return {
      round,
      questionId: `blind-${round - 1}`,
      prompt: r.hints[0] || 'Guess the answer!',
      optionImages: r.imageUrl ? [r.imageUrl] : undefined,
      endsAt: new Date(Date.now() + this.config.answerWindowSec * 1000).toISOString(),
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    if (typeof answer !== 'string' || !answer.trim()) return;

    const roundIdx = parseInt(questionId.replace('blind-', ''), 10);
    if (isNaN(roundIdx) || roundIdx < 0 || roundIdx >= this.config.rounds.length) return;

    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;

    const answerTimeMs = Date.now() - this.roundStartedAt;
    const windowMs = this.config.answerWindowSec * 1000;
    const correctAnswer = this.config.rounds[roundIdx]?.answer?.toLowerCase();

    if (answer.toLowerCase().trim() === correctAnswer) {
      await leaderboardService.addScore(this.sessionId, userId, 1);

      // Gamification: correct answer + speed bonus + streak
      this.gamificationService
        ?.recordCorrectAnswer(this.sessionId, userId, answerTimeMs, windowMs)
        .catch(() => {});
    } else {
      // Reset streak on wrong answer
      this.gamificationService?.resetStreak(this.sessionId, userId).catch(() => {});
    }
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `blind-${round - 1}`;

    // Get top 10 from leaderboard
    const topEntries = await leaderboardService.getTopScores(this.sessionId, 10);
    const percentages: Record<string, number> = {};
    for (const entry of topEntries) {
      percentages[entry.userId] = entry.score;
    }

    // Count total members in leaderboard
    const leaderboardKey = `session:${this.sessionId}:leaderboard`;
    const totalResponses = await redis.zcard(leaderboardKey);

    return {
      round,
      questionId,
      percentages,
      totalResponses,
      correctAnswer: this.config.rounds[round - 1]?.answer,
    };
  }

  async computeFinalResults(): Promise<FinalResults> {
    // Read full leaderboard for complete rankings
    const leaderboardKey = `session:${this.sessionId}:leaderboard`;
    const totalMembers = await redis.zcard(leaderboardKey);
    const allEntries = await leaderboardService.getTopScores(this.sessionId, totalMembers || 100);

    const rankings: Record<string, number> = {};
    for (const entry of allEntries) {
      rankings[entry.userId] = entry.score;
    }

    // Include full rankings in the final round results
    const finalRounds = [...this.roundResults];
    if (finalRounds.length > 0) {
      finalRounds[finalRounds.length - 1] = {
        ...finalRounds[finalRounds.length - 1],
        percentages: rankings,
      };
    }

    return {
      sessionId: this.sessionId,
      rounds: finalRounds,
      totalParticipants: this.participantIds.size,
    };
  }

  protected async getDistribution(_questionId: string): Promise<number[]> {
    // BlindTest is not histogram-based; data flows through percentages/leaderboard
    return [];
  }
}
