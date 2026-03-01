import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_ENVIRONMENT } from '$env/static/public';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  enabled: !!PUBLIC_SENTRY_DSN,
  environment: PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [replayIntegration()],
});

export const handleError = handleErrorWithSentry();
