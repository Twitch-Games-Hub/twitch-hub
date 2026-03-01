<script lang="ts">
  import { adStore } from '$lib/stores/ads.svelte';
  import AdSlot from './AdSlot.svelte';
  import { AD_INTERSTITIAL_MIN_DURATION_MS } from '$lib/constants';
  import Button from './Button.svelte';

  interface Props {
    visible: boolean;
    slotId: string;
    ondismiss: () => void;
  }

  let { visible, slotId, ondismiss }: Props = $props();

  let canDismiss = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  // Subscriber passthrough: immediately dismiss when ads shouldn't show
  $effect(() => {
    if (visible && !adStore.shouldShowAds) {
      ondismiss();
    }
  });

  // Start dismiss countdown when interstitial becomes visible
  $effect(() => {
    if (visible && adStore.shouldShowAds) {
      canDismiss = false;
      timer = setTimeout(() => {
        canDismiss = true;
      }, AD_INTERSTITIAL_MIN_DURATION_MS);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  });
</script>

{#if visible && adStore.shouldShowAds}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div class="w-full max-w-md space-y-4 text-center">
      <AdSlot {slotId} format="rectangle" class="mx-auto" />
      {#if canDismiss}
        <Button variant="ghost" size="sm" onclick={ondismiss}>Continue</Button>
      {:else}
        <p class="text-sm text-text-muted">Ad loading...</p>
      {/if}
    </div>
  </div>
{/if}
