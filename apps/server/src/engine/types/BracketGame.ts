import {
  GameType,
  type BracketConfig,
  type RoundData,
  type RoundResults,
  type FinalResults,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';
import { redis } from '../../db/redis.js';

export class BracketGame extends GameEngine<BracketConfig, string> {
  private matchups: [{ name: string; imageUrl?: string }, { name: string; imageUrl?: string }][] =
    [];
  private currentMatchupIndex = 0;
  private advancingItems: { name: string; imageUrl?: string }[] = [];

  constructor(sessionId: string, config: BracketConfig) {
    super(sessionId, config);
    // Build initial matchups from config.items as pairs
    const items = config.items;
    for (let i = 0; i < items.length - 1; i += 2) {
      this.matchups.push([items[i], items[i + 1]]);
    }
  }

  getGameType() {
    return GameType.BRACKET;
  }

  getTotalRounds(): number {
    // Total number of matchups across all bracket levels = bracketSize - 1
    return this.config.bracketSize - 1;
  }

  getRoundData(round: number): RoundData {
    const matchup = this.matchups[this.currentMatchupIndex];
    return {
      round,
      questionId: `matchup-${this.currentMatchupIndex}`,
      prompt: `${matchup?.[0]?.name} vs ${matchup?.[1]?.name}`,
      options: matchup ? [matchup[0].name, matchup[1].name] : [],
      optionImages: matchup ? [matchup[0].imageUrl ?? null, matchup[1].imageUrl ?? null] : [],
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    const matchup = this.matchups[this.currentMatchupIndex];
    if (!matchup) return;

    const isA = answer === 'A' || answer === matchup[0]?.name;
    const isB = answer === 'B' || answer === matchup[1]?.name;
    if (!isA && !isB) return;

    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return;
    const bucket = isA ? '0' : '1';
    await redis.hincrby(this.voteKey(questionId), bucket, 1);
    await redis.expire(this.voteKey(questionId), 3600);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `matchup-${this.currentMatchupIndex}`;
    const values = await redis.hgetall(this.voteKey(questionId));
    const a = parseInt(values['0'] || '0', 10);
    const b = parseInt(values['1'] || '0', 10);
    const total = a + b;

    const matchup = this.matchups[this.currentMatchupIndex];
    // Determine winner (higher votes advances); tie goes to first option
    const winner = b > a ? matchup?.[1] : matchup?.[0];
    if (winner) {
      this.advancingItems.push(winner);
    }

    // Check if all matchups in the current bracket level are done
    const matchupsInCurrentLevel = this.matchups.length;
    const completedInLevel = this.advancingItems.length;
    if (completedInLevel === matchupsInCurrentLevel && completedInLevel > 1) {
      // Form new matchups from advancing items for the next bracket level
      const newMatchups: [
        { name: string; imageUrl?: string },
        { name: string; imageUrl?: string },
      ][] = [];
      for (let i = 0; i < this.advancingItems.length - 1; i += 2) {
        newMatchups.push([this.advancingItems[i], this.advancingItems[i + 1]]);
      }
      this.matchups = newMatchups;
      this.advancingItems = [];
      this.currentMatchupIndex = 0;
    } else {
      this.currentMatchupIndex++;
    }

    return {
      round,
      questionId,
      percentages: {
        A: total ? (a / total) * 100 : 0,
        B: total ? (b / total) * 100 : 0,
      },
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
