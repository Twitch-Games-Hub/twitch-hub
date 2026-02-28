import { redis } from '../db/redis.js';

export class LeaderboardService {
  private leaderboardKey(sessionId: string): string {
    return `session:${sessionId}:leaderboard`;
  }

  async addScore(sessionId: string, userId: string, points: number): Promise<void> {
    await redis.zincrby(this.leaderboardKey(sessionId), points, userId);
  }

  async getTopScores(sessionId: string, count = 10): Promise<{ userId: string; score: number }[]> {
    const results = await redis.zrevrange(
      this.leaderboardKey(sessionId),
      0,
      count - 1,
      'WITHSCORES',
    );
    const entries: { userId: string; score: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({ userId: results[i], score: parseFloat(results[i + 1]) });
    }
    return entries;
  }

  async getUserRank(sessionId: string, userId: string): Promise<number | null> {
    const rank = await redis.zrevrank(this.leaderboardKey(sessionId), userId);
    return rank !== null ? rank + 1 : null;
  }

  async cleanup(sessionId: string): Promise<void> {
    await redis.del(this.leaderboardKey(sessionId));
  }
}

export const leaderboardService = new LeaderboardService();
