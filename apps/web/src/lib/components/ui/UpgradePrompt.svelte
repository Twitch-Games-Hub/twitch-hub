<script lang="ts">
  import * as Sentry from '@sentry/sveltekit';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  let { onclose }: { onclose?: () => void } = $props();

  Sentry.addBreadcrumb({ category: 'billing', message: 'upgrade_prompt_shown' });
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
        href="/dashboard/profile?tab=billing"
        size="sm"
        variant="primary"
        onclick={() =>
          Sentry.addBreadcrumb({ category: 'billing', message: 'upgrade_prompt_clicked' })}
      >
        View Plans
      </Button>
      {#if onclose}
        <Button size="sm" variant="ghost" onclick={onclose}>Dismiss</Button>
      {/if}
    </div>
  </div>
</Card>
