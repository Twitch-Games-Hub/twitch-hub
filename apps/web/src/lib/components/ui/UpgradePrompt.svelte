<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import { posthogStore } from '$lib/stores/posthog.svelte';

  let { onclose }: { onclose?: () => void } = $props();

  onMount(() => {
    posthogStore.capture('upgrade_prompt_shown');
  });
</script>

<Card padding="md" class="border-warning-500/20 bg-warning-900/10">
  <div class="space-y-3">
    <div>
      <h3 class="text-sm font-semibold text-text-primary">Session limit reached</h3>
      <p class="mt-1 text-xs text-text-muted">
        You've used all your free sessions this month. Upgrade or buy a credit pack to keep playing.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        href="/dashboard/billing"
        size="sm"
        variant="primary"
        onclick={() => posthogStore.capture('upgrade_prompt_clicked')}>View Plans</Button
      >
      {#if onclose}
        <Button size="sm" variant="ghost" onclick={onclose}>Dismiss</Button>
      {/if}
    </div>
  </div>
</Card>
