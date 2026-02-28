<script lang="ts">
  let { endsAt, compact = false }: { endsAt: string | null; compact?: boolean } = $props();

  let timeRemaining = $state(0);

  $effect(() => {
    if (!endsAt) {
      timeRemaining = 0;
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(endsAt!).getTime() - Date.now()) / 1000));
      timeRemaining = remaining;
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  });
</script>

{#if endsAt && timeRemaining >= 0}
  <span
    class="inline-flex items-center tabular-nums font-medium {compact
      ? 'text-sm'
      : 'text-base'} {timeRemaining <= 5 ? 'text-danger-500' : 'text-text-secondary'}"
    role="timer"
    aria-live="polite"
  >
    {timeRemaining}s
  </span>
{/if}
