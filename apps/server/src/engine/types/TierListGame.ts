import { GameType, type TierListConfig, type RoundData, type RoundResults, type FinalResults } from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

export class TierListGame extends GameEngine<TierListConfig, Record<string, string>> {
  getGameType() { return GameType.TIER_LIST; }

  getTotalRounds(): number {
    return 1; // Single round for tier list submission
  }

  getRoundData(round: number): RoundData {
    return {
      round,
      questionId: 'tier-list',
      prompt: 'Rank the items into tiers',
      options: this.config.items,
    };
  }

  async processAnswer(userId: string, answer: Record<string, string>, questionId: string): Promise<void> {
    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    const { redis } = await import('../../db/redis.js');
    // Store individual tier placements per item
    for (const [item, tier] of Object.entries(answer)) {
      await redis.hincrby(this.voteKey(`${questionId}:${item}`), tier, 1);
    }
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    return { round, questionId: 'tier-list', totalResponses: 0 };
  }

  async computeFinalResults(): Promise<FinalResults> {
    return { sessionId: this.sessionId, rounds: this.roundResults, totalParticipants: this.participantIds.size };
  }
}
