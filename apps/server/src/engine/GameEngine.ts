import {
  SessionStatus,
  type GameState,
  type RoundData,
  type RoundResults,
  type FinalResults,
  type VoteAggregation,
  type SessionSnapshot,
} from '@twitch-hub/shared-types';
import { redis } from '../db/redis.js';
import { logger } from '../logger.js';
import type { GamificationService } from '../services/GamificationService.js';

export const REDIS_VOTE_TTL_SEC = 3600;

export abstract class GameEngine<TConfig = unknown, TAnswer = unknown> {
  protected sessionId: string;
  protected config: TConfig;
  protected currentRound = 0;
  protected totalRounds = 0;
  protected status: SessionStatus = SessionStatus.LOBBY;
  protected roundResults: RoundResults[] = [];
  protected participantIds = new Set<string>();
  protected log;
  protected gameTitle = '';
  protected coverImageUrl?: string;

  // Throttled broadcast
  protected broadcastCallback?: (sessionId: string, event: string, data: unknown) => void;
  private broadcastTimer?: ReturnType<typeof setTimeout>;
  private pendingBroadcast?: VoteAggregation;
  private broadcastIntervalMs = 200; // 5 times per second max

  // Round timer
  private roundTimer?: ReturnType<typeof setTimeout>;
  private roundEndsAt?: string;

  // Auto-end callback (called when timer expires on last round)
  private onAutoEnd?: (finalResults: FinalResults) => void;

  // Gamification service (optional dependency)
  protected gamificationService?: GamificationService;

  constructor(sessionId: string, config: TConfig) {
    this.sessionId = sessionId;
    this.config = config;
    this.log = logger.child({ module: 'engine', sessionId });
  }

  setBroadcastCallback(cb: (sessionId: string, event: string, data: unknown) => void) {
    this.broadcastCallback = cb;
  }

  setOnAutoEnd(cb: (finalResults: FinalResults) => void) {
    this.onAutoEnd = cb;
  }

  setGamificationService(svc: GamificationService) {
    this.gamificationService = svc;
  }

  setGameMeta(title: string, coverImageUrl?: string) {
    this.gameTitle = title;
    this.coverImageUrl = coverImageUrl;
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
    this.status = SessionStatus.LIVE;
    this.log.info({ totalRounds: this.totalRounds }, 'Game started');
    return this.getState();
  }

  async startRound(): Promise<RoundData | null> {
    if (this.currentRound >= this.totalRounds) {
      this.log.warn(
        { currentRound: this.currentRound, totalRounds: this.totalRounds },
        'startRound called past total rounds',
      );
      return null;
    }
    this.currentRound++;
    const roundData = this.getRoundData(this.currentRound);

    // Clear Redis vote data for this round
    await redis.del(this.voteKey());

    // Start round timer if configured
    this.clearRoundTimer();
    const durationMs = this.getRoundDurationMs();
    if (durationMs > 0) {
      this.roundEndsAt = new Date(Date.now() + durationMs).toISOString();
      roundData.endsAt = this.roundEndsAt;
      const timerRound = this.currentRound;
      this.roundTimer = setTimeout(() => {
        if (this.currentRound === timerRound) {
          this.onRoundTimerExpired();
        }
      }, durationMs);
    }

    this.log.debug({ round: this.currentRound }, 'Round started');
    return roundData;
  }

  async onAnswer(userId: string, answer: TAnswer, questionId: string): Promise<void> {
    this.participantIds.add(userId);
    await this.processAnswer(userId, answer, questionId);
    // Set TTL on vote key after votes are written
    await redis.expire(this.voteKey(questionId), REDIS_VOTE_TTL_SEC);
    await this.scheduleBroadcast(questionId);

    // Gamification: track participation and first responders (fire-and-forget)
    if (this.gamificationService) {
      this.gamificationService
        .recordParticipation(this.sessionId, userId, this.currentRound)
        .catch(() => {});
      this.gamificationService
        .recordFirstResponder(this.sessionId, this.currentRound, userId)
        .catch(() => {});
    }
  }

  async endRound(): Promise<RoundResults> {
    this.clearRoundTimer();
    const results = await this.computeRoundResults(this.currentRound);
    this.roundResults.push(results);
    this.log.debug({ round: this.currentRound }, 'Round ended');
    return results;
  }

  async end(): Promise<FinalResults> {
    this.clearRoundTimer();
    // Finalize the current round if it hasn't been ended yet
    if (this.currentRound > 0 && this.roundResults.length < this.currentRound) {
      const results = await this.computeRoundResults(this.currentRound);
      this.roundResults.push(results);
    }
    this.status = SessionStatus.ENDED;
    this.log.info({ participants: this.participantIds.size }, 'Game ended');
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
      gameTitle: this.gameTitle || undefined,
      coverImageUrl: this.coverImageUrl,
    };
  }

  abstract getGameType(): import('@twitch-hub/shared-types').GameType;

  getParticipantIds(): Set<string> {
    return this.participantIds;
  }

  getTotalRoundsCount(): number {
    return this.totalRounds;
  }

  // --- Timer ---

  protected getRoundDurationMs(): number {
    return 0; // Override in subclasses to enable timer
  }

  private clearRoundTimer() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = undefined;
    }
    this.roundEndsAt = undefined;
  }

  private async onRoundTimerExpired() {
    this.log.info({ round: this.currentRound }, 'Round timer expired');

    const results = await this.endRound();
    this.broadcastCallback?.(this.sessionId, 'game:round-end', results);

    if (this.gamificationService) {
      const leaderboard = await this.gamificationService.getSessionLeaderboard(this.sessionId);
      this.broadcastCallback?.(this.sessionId, 'leaderboard:update', leaderboard);
    }

    if (this.currentRound < this.totalRounds) {
      const roundData = await this.startRound();
      this.broadcastCallback?.(this.sessionId, 'game:round-start', roundData);
      this.broadcastCallback?.(this.sessionId, 'game:state', this.getState());
    } else {
      const finalResults = await this.end();
      this.broadcastCallback?.(this.sessionId, 'game:ended', finalResults);
      this.onAutoEnd?.(finalResults);
    }
  }

  // --- Snapshot / Restore ---

  async getSnapshot(sessionId: string): Promise<SessionSnapshot> {
    const gameState = this.getState();
    let currentRound: RoundData | null = null;
    let votes: VoteAggregation | null = null;

    if (this.currentRound > 0 && this.status === SessionStatus.LIVE) {
      currentRound = this.getRoundData(this.currentRound);
      if (this.roundEndsAt) {
        currentRound.endsAt = this.roundEndsAt;
      }

      const questionId = currentRound.questionId;
      const distribution = await this.getDistribution(questionId);
      const totalVotes = distribution.reduce((sum, n) => sum + n, 0);
      votes = { questionId, distribution, totalVotes };
    }

    let finalResults: FinalResults | null = null;
    if (this.status === SessionStatus.ENDED) {
      finalResults = await this.computeFinalResults();
    }

    return {
      sessionId,
      gameState,
      currentRound,
      votes,
      participantCount: this.participantIds.size,
      finalResults,
    };
  }

  restoreState(currentRound: number, status: SessionStatus) {
    this.totalRounds = this.getTotalRounds();
    this.currentRound = currentRound;
    this.status = status;
    this.log.info({ currentRound, status, totalRounds: this.totalRounds }, 'State restored');
  }

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
    await redis.expire(this.dedupeKey(), REDIS_VOTE_TTL_SEC);
    return false;
  }

  // --- Vote helpers ---
  protected async recordVote(userId: string, questionId: string, bucket: string): Promise<boolean> {
    const isDupe = await this.isDuplicate(userId);
    if (isDupe) return false;
    const key = this.voteKey(questionId);
    await redis.hincrby(key, bucket, 1);
    await redis.expire(key, REDIS_VOTE_TTL_SEC);
    return true;
  }

  protected async getBinaryDistribution(questionId: string): Promise<[number, number]> {
    const values = await redis.hgetall(this.voteKey(questionId));
    return [parseInt(values['0'] || '0', 10), parseInt(values['1'] || '0', 10)];
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

  protected scheduleBroadcastRaw(event: string, data: unknown) {
    this.broadcastCallback?.(this.sessionId, event, data);
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
    this.log.debug('Cleaning up engine');
    this.clearRoundTimer();
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
    }

    // Clean up all Redis keys for this session using SCAN (non-blocking)
    const pattern = `session:${this.sessionId}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
