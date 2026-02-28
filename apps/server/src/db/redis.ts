import Redis from 'ioredis';
import { config } from '../config.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'redis' });

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    // Cap backoff at 30 seconds
    const delay = Math.min(times * 500, 30_000);
    log.warn({ attempt: times, delay }, 'Redis reconnecting');
    return delay;
  },
});

redis.on('error', (err) => {
  log.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  log.info('Connected to Redis');
});
