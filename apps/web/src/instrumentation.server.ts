import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: process.env.PUBLIC_SENTRY_DSN,
  enabled: !!process.env.PUBLIC_SENTRY_DSN,
  environment: process.env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.2,
  enableLogs: true,
});
