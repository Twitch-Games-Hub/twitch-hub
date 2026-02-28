import posthog from 'posthog-js';
import * as Sentry from '@sentry/sveltekit';
import type { ApiUser } from '@twitch-hub/shared-types';

function createPostHogStore() {
  let initialized = $state(false);

  return {
    get initialized() {
      return initialized;
    },

    init() {
      const key = import.meta.env.PUBLIC_POSTHOG_KEY;
      if (!key) return;

      posthog.init(key, {
        api_host: import.meta.env.PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
        defaults: '2026-01-30',
        capture_pageview: false,
        capture_pageleave: true,
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

    capturePageview(path: string) {
      if (!initialized) return;
      posthog.capture('$pageview', { $current_url: path });
    },
  };
}

export const posthogStore = createPostHogStore();
