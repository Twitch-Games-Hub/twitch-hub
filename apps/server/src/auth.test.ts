import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('./config.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
  },
}));

vi.mock('./db/client.js', () => ({
  prisma: {},
}));

import { verifyToken } from './auth.js';

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns payload for a valid token', () => {
    const token = jwt.sign({ userId: 'user-123', twitchId: 'twitch-456' }, 'test-secret-key', {
      expiresIn: '1h',
    });

    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user-123');
    expect(result!.twitchId).toBe('twitch-456');
  });

  it('returns null for an invalid token', () => {
    const result = verifyToken('not-a-valid-jwt');
    expect(result).toBeNull();
  });

  it('returns null for a token signed with wrong secret', () => {
    const token = jwt.sign({ userId: 'user-123', twitchId: 'twitch-456' }, 'wrong-secret');

    const result = verifyToken(token);
    expect(result).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = jwt.sign(
      { userId: 'user-123', twitchId: 'twitch-456' },
      'test-secret-key',
      { expiresIn: '0s' }, // immediately expired
    );

    // Small delay to ensure expiration
    const result = verifyToken(token);
    expect(result).toBeNull();
  });

  it('returns null for an empty string', () => {
    const result = verifyToken('');
    expect(result).toBeNull();
  });
});
