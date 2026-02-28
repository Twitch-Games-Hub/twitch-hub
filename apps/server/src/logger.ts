import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: () => crypto.randomUUID(),
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  customLogLevel: (_req, res, err) => {
    if (err || (res.statusCode && res.statusCode >= 500)) return 'error';
    if (res.statusCode && res.statusCode >= 400) return 'warn';
    return 'info';
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-internal-secret"]'],
  },
});
