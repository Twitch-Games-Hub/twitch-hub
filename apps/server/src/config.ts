import 'dotenv/config';

export const config = {
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://twitch_hub:twitch_hub@localhost:5432/twitch_hub',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    redirectUri: process.env.TWITCH_REDIRECT_URI || 'http://localhost:5173/api/auth/callback',
  },
  appUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  sentryDsn: process.env.SENTRY_DSN || '',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    annualPriceId: process.env.STRIPE_ANNUAL_PRICE_ID || '',
    creditPackPriceId: process.env.STRIPE_CREDIT_PACK_PRICE_ID || '',
  },
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY || '',
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  },
};

const isProduction = process.env.NODE_ENV === 'production';

// These console.error calls run at import-time before the pino logger initializes,
// so they must remain as console.error + process.exit(1).
export function validateConfig() {
  const required: { key: string; value: string }[] = [
    { key: 'JWT_SECRET', value: config.jwtSecret },
    { key: 'INTERNAL_API_SECRET', value: config.internalApiSecret },
    { key: 'TWITCH_CLIENT_ID', value: config.twitch.clientId },
    { key: 'TWITCH_CLIENT_SECRET', value: config.twitch.clientSecret },
  ];

  if (isProduction && config.jwtSecret === 'dev-secret') {
    console.error('FATAL: JWT_SECRET must not be "dev-secret" in production');
    process.exit(1);
  }

  const missing = required.filter((r) => !r.value).map((r) => r.key);
  if (isProduction && missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
