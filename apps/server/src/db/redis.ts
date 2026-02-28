import Redis from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    // Cap backoff at 30 seconds
    const delay = Math.min(times * 500, 30_000);
    console.log(`Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});
