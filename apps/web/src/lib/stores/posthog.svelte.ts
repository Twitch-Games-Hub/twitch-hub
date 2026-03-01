import posthog from 'posthog-js';
import * as Sentry from '@sentry/sveltekit';
import { PUBLIC_POSTHOG_KEY, PUBLIC_POSTHOG_HOST } from '$env/static/public';
import type { ApiUser } from '@twitch-hub/shared-types';

function createPostHogStore() {
  let initialized = $state(false);

  return {
    get initialized() {
      return initialized;
    },

    init() {
      if (!PUBLIC_POSTHOG_KEY) return;

      posthog.init(PUBLIC_POSTHOG_KEY, {
        api_host: PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
        defaults: '2026-01-30',
        loaded: (ph) => {
          initialized = true;
          const sessionId = ph.get_session_id();
          if (sessionId) {
            Sentry.setTag('posthog_session_id', sessionId);
          }
        },
      });
    },

    identify(user: ApiUser) {
      if (!initialized) return;
      posthog.identify(user.id, {
        twitch_id: user.twitchId,
        twitch_login: user.twitchLogin,
        display_name: user.displayName,
        billing_plan: user.billingPlan,
      });
      posthog.group('billing_plan', user.billingPlan);
    },

    reset() {
      if (!initialized) return;
      posthog.reset();
    },

    capture(event: string, properties?: Record<string, unknown>) {
      if (!initialized) return;
      posthog.capture(event, properties);
    },
  };
}

export const posthogStore = createPostHogStore();
