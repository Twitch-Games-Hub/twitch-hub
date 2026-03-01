import {
  GameType,
  type RankingConfig,
  type RankingItem,
  type RoundData,
  type RoundResults,
  type FinalResults,
  type BracketMatchupResult,
} from '@twitch-hub/shared-types';
import { GameEngine } from '../GameEngine.js';

interface Matchup {
  index: number;
  bracketLevel: number;
  itemA: RankingItem;
  itemB: RankingItem;
  winnerId?: string;
  voteCountA?: number;
  voteCountB?: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLevelName(bracketLevel: number, bracketSize: number): string {
  const remaining = bracketSize / Math.pow(2, bracketLevel);
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semifinals';
  if (remaining === 4) return 'Quarterfinals';
  return `Round of ${remaining * 2}`;
}

export class RankingGame extends GameEngine<RankingConfig, string> {
  private matchups: Matchup[] = [];
  private currentMatchupIdx = 0;

  constructor(sessionId: string, config: RankingConfig) {
    super(sessionId, config);
    this.buildBracket();
  }

  private buildBracket() {
    const items = shuffle(this.config.items.slice(0, this.config.bracketSize));
    const totalLevels = Math.log2(items.length);

    // Generate first-level matchups
    let matchupIndex = 0;
    for (let i = 0; i < items.length; i += 2) {
      this.matchups.push({
        index: matchupIndex++,
        bracketLevel: 0,
        itemA: items[i],
        itemB: items[i + 1],
      });
    }

    // Pre-allocate placeholders for subsequent levels
    let pairsInLevel = items.length / 4;
    for (let level = 1; level < totalLevels; level++) {
      for (let i = 0; i < pairsInLevel; i++) {
        this.matchups.push({
          index: matchupIndex++,
          bracketLevel: level,
          itemA: { id: '', name: '' }, // populated dynamically
          itemB: { id: '', name: '' },
        });
      }
      pairsInLevel /= 2;
    }
  }

  getGameType() {
    return GameType.RANKING;
  }

  getTotalRounds(): number {
    return this.config.bracketSize - 1;
  }

  getRoundData(round: number): RoundData {
    const matchup = this.matchups[round - 1];
    const levelName = getLevelName(matchup.bracketLevel, this.config.bracketSize);
    return {
      round,
      questionId: `ranking-${round - 1}`,
      prompt: `${matchup.itemA.name} vs ${matchup.itemB.name}`,
      options: [matchup.itemA.name, matchup.itemB.name],
      optionImages: [matchup.itemA.imageUrl ?? null, matchup.itemB.imageUrl ?? null],
      meta: {
        bracketLevel: matchup.bracketLevel,
        levelName,
        matchupIndex: matchup.index,
        bracketSize: this.config.bracketSize,
      },
    };
  }

  async processAnswer(userId: string, answer: string, questionId: string): Promise<void> {
    const matchup = this.matchups[this.currentMatchupIdx];
    if (!matchup) return;

    const isA =
      answer === 'A' || answer === '1' || answer.toLowerCase() === matchup.itemA.name.toLowerCase();
    const isB =
      answer === 'B' || answer === '2' || answer.toLowerCase() === matchup.itemB.name.toLowerCase();
    if (!isA && !isB) return;

    const bucket = isA ? '0' : '1';
    await this.recordVote(userId, questionId, bucket);
  }

  async computeRoundResults(round: number): Promise<RoundResults> {
    const questionId = `ranking-${round - 1}`;
    const [a, b] = await this.getBinaryDistribution(questionId);
    const total = a + b;

    // Determine winner (A wins ties)
    const matchup = this.matchups[round - 1];
    const winner = b > a ? matchup.itemB : matchup.itemA;
    matchup.winnerId = winner.id;
    matchup.voteCountA = a;
    matchup.voteCountB = b;

    // Populate next-level matchup with the winner
    this.advanceWinner(round - 1, winner);

    this.currentMatchupIdx = round; // next matchup

    return {
      round,
      questionId,
      distribution: [a, b],
      percentages: { A: total ? (a / total) * 100 : 0, B: total ? (b / total) * 100 : 0 },
      totalResponses: total,
    };
  }

  private advanceWinner(matchupIdx: number, winner: RankingItem) {
    const matchup = this.matchups[matchupIdx];
    const level = matchup.bracketLevel;
    const nextLevel = level + 1;

    // Find all matchups at this level
    const levelMatchups = this.matchups.filter((m) => m.bracketLevel === level);
    const positionInLevel = levelMatchups.indexOf(matchup);

    // Find all matchups at the next level
    const nextLevelMatchups = this.matchups.filter((m) => m.bracketLevel === nextLevel);
    if (nextLevelMatchups.length === 0) return; // this was the final

    const nextMatchup = nextLevelMatchups[Math.floor(positionInLevel / 2)];
    if (positionInLevel % 2 === 0) {
      nextMatchup.itemA = winner;
    } else {
      nextMatchup.itemB = winner;
    }
  }

  async computeFinalResults(): Promise<FinalResults> {
    const completedMatchups: BracketMatchupResult[] = this.matchups
      .filter((m) => m.winnerId)
      .map((m) => ({
        matchupIndex: m.index,
        bracketLevel: m.bracketLevel,
        itemA: { id: m.itemA.id, name: m.itemA.name, imageUrl: m.itemA.imageUrl },
        itemB: { id: m.itemB.id, name: m.itemB.name, imageUrl: m.itemB.imageUrl },
        winnerId: m.winnerId!,
        voteCountA: m.voteCountA ?? 0,
        voteCountB: m.voteCountB ?? 0,
      }));

    // Build rankings from bracket results
    const rankings = this.computeRankings();
    const champion = rankings[0]?.item ?? { id: '', name: '' };

    return {
      sessionId: this.sessionId,
      rounds: this.roundResults,
      totalParticipants: this.participantIds.size,
      ranking: {
        bracketSize: this.config.bracketSize,
        matchups: completedMatchups,
        champion,
        rankings,
      },
    };
  }

  private computeRankings(): { rank: number; item: RankingItem }[] {
    const totalLevels = Math.log2(this.config.bracketSize);
    const rankings: { rank: number; item: RankingItem }[] = [];

    // Champion: winner of the final
    const finalMatchup = this.matchups.find((m) => m.bracketLevel === totalLevels - 1);
    if (finalMatchup?.winnerId) {
      const champion =
        finalMatchup.winnerId === finalMatchup.itemA.id ? finalMatchup.itemA : finalMatchup.itemB;
      const runnerUp =
        finalMatchup.winnerId === finalMatchup.itemA.id ? finalMatchup.itemB : finalMatchup.itemA;
      rankings.push({ rank: 1, item: champion });
      rankings.push({ rank: 2, item: runnerUp });
    }

    // Losers at each level get tied rank
    for (let level = totalLevels - 2; level >= 0; level--) {
      const levelMatchups = this.matchups.filter((m) => m.bracketLevel === level && m.winnerId);
      const rank = rankings.length + 1;
      for (const m of levelMatchups) {
        const loser = m.winnerId === m.itemA.id ? m.itemB : m.itemA;
        if (loser.id) {
          rankings.push({ rank, item: loser });
        }
      }
    }

    return rankings;
  }

  protected getRoundDurationMs(): number {
    return this.config.roundDurationSec * 1000;
  }

  protected async getDistribution(questionId: string): Promise<number[]> {
    return this.getBinaryDistribution(questionId);
  }
}
