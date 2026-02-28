import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = vi.hoisted(() => ({
  zincrby: vi.fn(),
  zrevrange: vi.fn(),
  zrevrank: vi.fn(),
  del: vi.fn(),
}));

vi.mock('../db/redis.js', () => ({
  redis: mockRedis,
}));

vi.mock('../config.js', () => ({
  config: { redisUrl: 'redis://localhost:6379' },
}));

import { LeaderboardService } from './LeaderboardService.js';

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LeaderboardService();
  });

  describe('addScore', () => {
    it('increments score for user in sorted set', async () => {
      await service.addScore('session-1', 'user-1', 10);

      expect(mockRedis.zincrby).toHaveBeenCalledWith('session:session-1:leaderboard', 10, 'user-1');
    });

    it('supports negative scores', async () => {
      await service.addScore('session-1', 'user-1', -5);

      expect(mockRedis.zincrby).toHaveBeenCalledWith('session:session-1:leaderboard', -5, 'user-1');
    });
  });

  describe('getTopScores', () => {
    it('returns top scores in descending order', async () => {
      mockRedis.zrevrange.mockResolvedValue(['user-a', '100', 'user-b', '75', 'user-c', '50']);

      const result = await service.getTopScores('session-1', 3);

      expect(result).toEqual([
        { userId: 'user-a', score: 100 },
        { userId: 'user-b', score: 75 },
        { userId: 'user-c', score: 50 },
      ]);
      expect(mockRedis.zrevrange).toHaveBeenCalledWith(
        'session:session-1:leaderboard',
        0,
        2,
        'WITHSCORES',
      );
    });

    it('defaults to top 10', async () => {
      mockRedis.zrevrange.mockResolvedValue([]);

      await service.getTopScores('session-1');

      expect(mockRedis.zrevrange).toHaveBeenCalledWith(
        'session:session-1:leaderboard',
        0,
        9,
        'WITHSCORES',
      );
    });

    it('returns empty array when no scores exist', async () => {
      mockRedis.zrevrange.mockResolvedValue([]);

      const result = await service.getTopScores('session-1');
      expect(result).toEqual([]);
    });
  });

  describe('getUserRank', () => {
    it('returns 1-indexed rank for existing user', async () => {
      mockRedis.zrevrank.mockResolvedValue(0);

      const rank = await service.getUserRank('session-1', 'user-1');
      expect(rank).toBe(1);
    });

    it('returns correct rank for non-first user', async () => {
      mockRedis.zrevrank.mockResolvedValue(4);

      const rank = await service.getUserRank('session-1', 'user-5');
      expect(rank).toBe(5);
    });

    it('returns null for user not in leaderboard', async () => {
      mockRedis.zrevrank.mockResolvedValue(null);

      const rank = await service.getUserRank('session-1', 'unknown-user');
      expect(rank).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('deletes the leaderboard key', async () => {
      await service.cleanup('session-1');

      expect(mockRedis.del).toHaveBeenCalledWith('session:session-1:leaderboard');
    });
  });
});
