import { PUBLIC_ADSENSE_PUBLISHER_ID } from '$env/static/public';
import { authStore } from '$lib/stores/auth.svelte';
import { subscriptionStore } from '$lib/stores/subscription.svelte';
import { ADSENSE_SCRIPT_URL } from '$lib/constants';
import * as Sentry from '@sentry/sveltekit';

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

function createAdStore() {
  let enabled = $state(false);
  let scriptLoaded = $state(false);
  let scriptError = $state(false);
  let scriptLoading = $state(false);

  function loadScript() {
    if (typeof window === 'undefined') return;
    if (scriptLoaded || scriptLoading) return;
    if (!PUBLIC_ADSENSE_PUBLISHER_ID) return;

    scriptLoading = true;

    const script = document.createElement('script');
    script.src = `${ADSENSE_SCRIPT_URL}?client=${PUBLIC_ADSENSE_PUBLISHER_ID}`;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      window.adsbygoogle = window.adsbygoogle || [];
    };

    script.onerror = () => {
      scriptError = true;
      scriptLoading = false;
      Sentry.addBreadcrumb({
        category: 'ads',
        message: 'AdSense script failed to load (likely ad blocker)',
        level: 'info',
      });
    };

    document.head.appendChild(script);
  }

  function pushAd() {
    if (!scriptLoaded || typeof window === 'undefined') return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (err) {
      Sentry.addBreadcrumb({
        category: 'ads',
        message: 'adsbygoogle.push() failed',
        level: 'warning',
        data: { error: err instanceof Error ? err.message : 'unknown' },
      });
    }
  }

  return {
    get enabled() {
      return enabled;
    },
    get scriptLoaded() {
      return scriptLoaded;
    },
    get scriptError() {
      return scriptError;
    },
    get shouldShowAds() {
      if (!enabled || !scriptLoaded) return false;
      if (authStore.user && subscriptionStore.isSubscriber) return false;
      return true;
    },

    enable() {
      enabled = true;
      loadScript();
    },

    disable() {
      enabled = false;
    },

    pushAd,
  };
}

export const adStore = createAdStore();
