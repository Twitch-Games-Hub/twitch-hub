import { SessionStatus, type GameState, type RoundData, type RoundResults, type FinalResults, type VoteAggregation } from '@twitch-hub/shared-types';
import { redis } from '../db/redis.js';

export abstract class GameEngine<TConfig = unknown, TAnswer = unknown> {
  protected sessionId: string;
  protected config: TConfig;
  protected currentRound = 0;
  protected totalRounds = 0;
  protected status: SessionStatus = SessionStatus.WAITING;
  protected roundResults: RoundResults[] = [];
  protected participantIds = new Set<string>();

  // Throttled broadcast
  private broadcastCallback?: (sessionId: string, event: string, data: unknown) => void;
  private broadcastTimer?: ReturnType<typeof setTimeout>;
  private pendingBroadcast?: VoteAggregation;
  private broadcastIntervalMs = 200; // 5 times per second max

  constructor(sessionId: string, config: TConfig) {
    this.sessionId = sessionId;
    this.config = config;
  }

  setBroadcastCallback(cb: (sessionId: string, event: string, data: unknown) => void) {
    this.broadcastCallback = cb;
  }

  // --- Abstract methods that game types implement ---
  abstract getTotalRounds(): number;
  abstract getRoundData(round: number): RoundData;
  abstract processAnswer(userId: string, answer: TAnswer, questionId: string): Promise<void>;
  abstract computeRoundResults(round: number): Promise<RoundResults>;
  abstract computeFinalResults(): Promise<FinalResults>;

  // --- Lifecycle methods ---
  async start(): Promise<GameState> {
    this.totalRounds = this.getTotalRounds();
    this.currentRound = 0;
    this.status = SessionStatus.ACTIVE;
    return this.getState();
  }

  async startRound(): Promise<RoundData> {
    this.currentRound++;
    const roundData = this.getRoundData(this.currentRound);

    // Clear Redis vote data for this round
    await redis.del(this.voteKey());

    return roundData;
  }

  async onAnswer(userId: string, answer: TAnswer, questionId: string): Promise<void> {
    this.participantIds.add(userId);
    await this.processAnswer(userId, answer, questionId);
    await this.scheduleBroadcast(questionId);
  }

  async endRound(): Promise<RoundResults> {
    const results = await this.computeRoundResults(this.currentRound);
    this.roundResults.push(results);
    return results;
  }

  async end(): Promise<FinalResults> {
    this.status = SessionStatus.COMPLETED;
    return this.computeFinalResults();
  }

  getState(): GameState {
    return {
      sessionId: this.sessionId,
      gameType: this.getGameType(),
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      participantCount: this.participantIds.size,
    };
  }

  abstract getGameType(): import('@twitch-hub/shared-types').GameType;

  // --- Redis helpers ---
  protected voteKey(questionId?: string): string {
    const qid = questionId || `round-${this.currentRound}`;
    return `session:${this.sessionId}:votes:${qid}`;
  }

  protected dedupeKey(): string {
    return `session:${this.sessionId}:dedupe:round-${this.currentRound}`;
  }

  protected async isDuplicate(userId: string): Promise<boolean> {
    const added = await redis.sadd(this.dedupeKey(), userId);
    if (added === 0) return true;
    // Expire dedupe set after 1 hour
    await redis.expire(this.dedupeKey(), 3600);
    return false;
  }

  // --- Throttled broadcast ---
  private async scheduleBroadcast(questionId: string) {
    const distribution = await this.getDistribution(questionId);
    const totalVotes = distribution.reduce((sum, n) => sum + n, 0);

    this.pendingBroadcast = { questionId, distribution, totalVotes };

    if (!this.broadcastTimer) {
      this.broadcastTimer = setTimeout(() => {
        if (this.pendingBroadcast && this.broadcastCallback) {
          this.broadcastCallback(this.sessionId, 'votes:update', this.pendingBroadcast);
          this.broadcastCallback(this.sessionId, 'participants:count', this.participantIds.size);
        }
        this.broadcastTimer = undefined;
      }, this.broadcastIntervalMs);
    }
  }

  protected async getDistribution(questionId: string): Promise<number[]> {
    // Default: 10-bucket histogram (for HotTake). Override in subclasses.
    const key = this.voteKey(questionId);
    const values = await redis.hgetall(key);
    const dist = new Array(10).fill(0);
    for (const [bucket, count] of Object.entries(values)) {
      const idx = parseInt(bucket, 10);
      if (idx >= 0 && idx < 10) {
        dist[idx] = parseInt(count, 10);
      }
    }
    return dist;
  }

  // Cleanup
  async cleanup() {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
    }
  }
}
