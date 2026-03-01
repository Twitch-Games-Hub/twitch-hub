<script lang="ts">
  export interface XpPopupItem {
    id: number;
    text: string;
  }

  let { popups }: { popups: XpPopupItem[] } = $props();
</script>

<!-- Fixed bottom-center, above the game area -->
<div class="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2" aria-hidden="true">
  {#each popups as popup (popup.id)}
    <span
      class="animate-xp-float absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600/90 px-3 py-1 text-sm font-bold text-white shadow-lg"
    >
      {popup.text}
    </span>
  {/each}
</div>
