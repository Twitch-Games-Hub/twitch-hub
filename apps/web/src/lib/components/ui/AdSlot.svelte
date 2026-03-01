<script lang="ts">
  import { adStore } from '$lib/stores/ads.svelte';
  import { PUBLIC_ADSENSE_PUBLISHER_ID } from '$env/static/public';

  interface Props {
    slotId: string;
    format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
    responsive?: boolean;
    class?: string;
  }

  let { slotId, format = 'auto', responsive = true, class: className = '' }: Props = $props();

  let adPushed = $state(false);

  $effect(() => {
    if (adStore.shouldShowAds && !adPushed) {
      adStore.pushAd();
      adPushed = true;
    }
  });
</script>

{#if adStore.shouldShowAds}
  <div role="complementary" aria-label="Advertisement" class={className}>
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client={PUBLIC_ADSENSE_PUBLISHER_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    ></ins>
  </div>
{/if}
