<script lang="ts">
  import { subscriptionStore } from '$lib/stores/subscription.svelte';
</script>

{#if subscriptionStore.loading}
  <div class="h-5 w-32 animate-pulse rounded bg-surface-elevated"></div>
{:else if subscriptionStore.isSubscriber}
  <span
    class="inline-flex items-center gap-1.5 rounded-full bg-brand-900/30 px-2.5 py-0.5 text-xs font-medium text-brand-400 border border-brand-500/20"
  >
    Unlimited Sessions
  </span>
{:else}
  {@const freeRemaining = subscriptionStore.freeRemaining}
  {@const credits = subscriptionStore.sessionCredits}
  {@const total = freeRemaining + credits}
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border {total >
    0
      ? 'bg-surface-elevated text-text-secondary border-border-subtle'
      : 'bg-danger-900/30 text-danger-400 border-danger-500/20'}"
  >
    {#if total > 0}
      {total} session{total !== 1 ? 's' : ''} remaining
    {:else}
      No sessions remaining
    {/if}
  </span>
{/if}
