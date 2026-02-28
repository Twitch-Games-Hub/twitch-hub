import {
  GameType,
  type TierListConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';
import { redis } from '../../db/redis.js';

export class TierListGame extends GameEngine<TierListConfig, Record<string, string>> {
  getGameType() {
    return GameType.TIER_LIST;
  }

  getTotalRounds(): number {
    return 1; // Single round for tier list submission
  }

  getRoundData(round: number): RoundData {
    return {
      round,
      questionId: 'tier-list',
      prompt: 'Rank the items into tiers',
      options: this.config.items.map((item) => item.name),
      optionImages: this.config.items.map((item) => item.imageUrl ?? null),
    };
  }

  async processAnswer(
    userId: string,
    answer: Record<string, string>,
    questionId: string,
  ): Promise<void> {
    if (!answer || typeof answer !== 'object') return;

    const validItems = new Set(this.config.items.map((item) => item.name));
    const validTiers = new Set(this.config.tiers);

    // Filter to only valid item+tier combinations
    const validEntries = Object.entries(answer).filter(
      ([item, tier]) => validItems.has(item) && validTiers.has(tier),
    );
    if (validEntries.length === 0) return;

    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    for (const [item, tier] of validEntries) {
      const key = this.voteKey(`${questionId}:${item}`);
      await redis.hincrby(key, tier, 1);
      await redis.expire(key, 3600);
    }
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = 'tier-list';
    const percentages: Record<string, number> = {};
    const voterSet = new Set<string>();

    for (const item of this.config.items) {
      const itemName = item.name;
      const values = await redis.hgetall(this.voteKey(`${questionId}:${itemName}`));
      let maxVotes = 0;
      let consensusTier = this.config.tiers[0] || 'S';

      for (const [tier, count] of Object.entries(values)) {
        const voteCount = parseInt(count, 10);
        percentages[`${itemName}:${tier}`] = voteCount;
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          consensusTier = tier;
        }
      }

      // Track consensus placement
      percentages[`${itemName}:consensus`] = this.config.tiers.indexOf(consensusTier);
    }

    // Count unique voters from the dedupe set
    const dedupeMembers = await redis.scard(this.dedupeKey());
    const totalResponses = dedupeMembers || 0;

    return {
      round,
      questionId,
      percentages,
      totalResponses,
    };
  }

  async computeFinalResults(): Promise<FinalResults> {
    // Build consensus map: item -> tier index (numeric for percentages compatibility)
    const consensusPercentages: Record<string, number> = {};
    for (const item of this.config.items) {
      const itemName = item.name;
      const values = await redis.hgetall(this.voteKey(`tier-list:${itemName}`));
      let maxVotes = 0;
      let consensusTier = this.config.tiers[0] || 'S';

      for (const [tier, count] of Object.entries(values)) {
        const voteCount = parseInt(count, 10);
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          consensusTier = tier;
        }
      }
      // Store consensus as tier index so it fits Record<string, number>
      consensusPercentages[`${itemName}:consensus`] = this.config.tiers.indexOf(consensusTier);
    }

    const finalRounds = [...this.roundResults];
    if (finalRounds.length > 0) {
      finalRounds[finalRounds.length - 1] = {
        ...finalRounds[finalRounds.length - 1],
        percentages: {
          ...finalRounds[finalRounds.length - 1].percentages,
          ...consensusPercentages,
        },
      };
    }

    return {
      sessionId: this.sessionId,
      rounds: finalRounds,
      totalParticipants: this.participantIds.size,
    };
  }

  protected async getDistribution(questionId: string): Promise<number[]> {
    // Aggregate vote counts per tier across all items
    const tierCounts: Record<string, number> = {};
    for (const tier of this.config.tiers) {
      tierCounts[tier] = 0;
    }

    for (const item of this.config.items) {
      const values = await redis.hgetall(this.voteKey(`${questionId}:${item.name}`));
      for (const [tier, count] of Object.entries(values)) {
        tierCounts[tier] = (tierCounts[tier] || 0) + parseInt(count, 10);
      }
    }

    // Return array in tier order
    return this.config.tiers.map((tier) => tierCounts[tier] || 0);
  }
}
