import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import crypto from 'crypto';
import pino from 'pino';
import { config } from './config.js';

const isProduction = process.env.NODE_ENV === 'production';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-internal-secret"]',
      ],
    },
    genReqId: () => crypto.randomUUID(),
  });

  app.decorateRequest('userId', undefined);
  app.decorateRequest('game', undefined);
  app.decorateRequest('sessionBudget', undefined);

  await app.register(fastifyCors, {
    origin: config.appUrl,
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: (req) => !req.url!.startsWith('/api'),
  });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
