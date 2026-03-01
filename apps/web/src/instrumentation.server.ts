import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://c44fca6e45cc7094dea0a375c65a751e@o4510966515564544.ingest.de.sentry.io/4510966517334096',
  environment: process.env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.2,
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })],
});
