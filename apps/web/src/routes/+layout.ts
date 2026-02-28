import { browser } from '$app/environment';
import { posthogStore } from '$lib/stores/posthog.svelte';

export const load = async () => {
  if (browser) {
    posthogStore.init();
  }
};
