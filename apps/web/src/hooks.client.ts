import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import { posthogStore } from '$lib/stores/posthog.svelte';

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  enabled: !!import.meta.env.PUBLIC_SENTRY_DSN,
  environment: import.meta.env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [replayIntegration()],
});

posthogStore.init();

export const handleError = handleErrorWithSentry();
