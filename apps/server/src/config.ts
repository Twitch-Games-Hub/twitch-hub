import 'dotenv/config';

export const config = {
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://twitch_hub:twitch_hub@localhost:5432/twitch_hub',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    redirectUri: process.env.TWITCH_REDIRECT_URI || 'http://localhost:5173/api/auth/callback',
  },
  appUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
};
