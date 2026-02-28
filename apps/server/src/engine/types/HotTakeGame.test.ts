import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameType } from '@twitch-hub/shared-types';

const mockRedis = vi.hoisted(() => ({
  hincrby: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  del: vi.fn(),
  hgetall: vi.fn(),
}));

vi.mock('../../db/redis.js', () => ({
  redis: mockRedis,
}));

vi.mock('../../config.js', () => ({
  config: { redisUrl: 'redis://localhost:6379' },
}));

import { HotTakeGame } from './HotTakeGame.js';

const testConfig = {
  statements: ['Pineapple on pizza is great', 'Tabs are better than spaces'],
  roundDurationSec: 30,
};

describe('HotTakeGame', () => {
  let game: HotTakeGame;

  beforeEach(() => {
    vi.clearAllMocks();
    game = new HotTakeGame('session-1', testConfig);
  });

  it('returns correct game type', () => {
    expect(game.getGameType()).toBe(GameType.HOT_TAKE);
  });

  it('returns total rounds matching statement count', () => {
    expect(game.getTotalRounds()).toBe(2);
  });

  describe('getRoundData', () => {
    it('returns round data with correct prompt', () => {
      const data = game.getRoundData(1);
      expect(data).toEqual({
        round: 1,
        questionId: 'statement-0',
        prompt: 'Pineapple on pizza is great',
      });
    });

    it('returns second round data', () => {
      const data = game.getRoundData(2);
      expect(data).toEqual({
        round: 2,
        questionId: 'statement-1',
        prompt: 'Tabs are better than spaces',
      });
    });
  });

  describe('processAnswer', () => {
    beforeEach(() => {
      // Simulate sadd returning 1 (not duplicate)
      mockRedis.sadd.mockResolvedValue(1);
    });

    it('accepts valid ratings 1-10', async () => {
      await game.processAnswer('user-1', 5, 'statement-0');

      // Rating 5 → bucket index 4 (0-indexed)
      expect(mockRedis.hincrby).toHaveBeenCalledWith('session:session-1:votes:statement-0', '4', 1);
    });

    it('rounds decimal ratings', async () => {
      await game.processAnswer('user-1', 7.6, 'statement-0');

      // 7.6 rounds to 8, bucket index 7
      expect(mockRedis.hincrby).toHaveBeenCalledWith('session:session-1:votes:statement-0', '7', 1);
    });

    it('rejects rating below 1', async () => {
      await expect(game.processAnswer('user-1', 0, 'statement-0')).rejects.toThrow(
        'Rating must be between 1 and 10',
      );
    });

    it('rejects rating above 10', async () => {
      await expect(game.processAnswer('user-1', 11, 'statement-0')).rejects.toThrow(
        'Rating must be between 1 and 10',
      );
    });

    it('rejects NaN rating', async () => {
      await expect(game.processAnswer('user-1', NaN, 'statement-0')).rejects.toThrow(
        'Rating must be between 1 and 10',
      );
    });

    it('skips duplicate votes from same user', async () => {
      mockRedis.sadd.mockResolvedValue(0); // Already exists

      await game.processAnswer('user-1', 5, 'statement-0');

      expect(mockRedis.hincrby).not.toHaveBeenCalled();
    });

    it('sets TTL on vote key', async () => {
      await game.processAnswer('user-1', 5, 'statement-0');

      expect(mockRedis.expire).toHaveBeenCalledWith('session:session-1:votes:statement-0', 3600);
    });
  });

  describe('computeRoundResults', () => {
    it('returns distribution and total responses', async () => {
      mockRedis.hgetall.mockResolvedValue({
        '0': '3',
        '4': '10',
        '9': '7',
      });

      const results = await game.computeRoundResults(1);

      expect(results.round).toBe(1);
      expect(results.questionId).toBe('statement-0');
      expect(results.distribution).toEqual([3, 0, 0, 0, 10, 0, 0, 0, 0, 7]);
      expect(results.totalResponses).toBe(20);
    });

    it('returns all zeros when no votes', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const results = await game.computeRoundResults(1);

      expect(results.distribution).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(results.totalResponses).toBe(0);
    });
  });

  describe('computeFinalResults', () => {
    it('returns session summary', async () => {
      const results = await game.computeFinalResults();

      expect(results.sessionId).toBe('session-1');
      expect(results.rounds).toEqual([]);
      expect(results.totalParticipants).toBe(0);
    });
  });
});
