<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import CountdownTimer from '$lib/components/ui/CountdownTimer.svelte';

  let { title }: { title: string } = $props();

  const status = $derived(gameStore.gameState?.status);
  const phase = $derived(status === 'ACTIVE' ? 'LIVE' : status === 'WAITING' ? 'LOBBY' : 'ENDED');
  const dotColor = $derived(
    status === 'ACTIVE'
      ? 'bg-success-500'
      : status === 'WAITING'
        ? 'bg-warning-500'
        : 'bg-text-muted',
  );
  const displayTitle = $derived(gameStore.currentRound?.prompt ?? title);
</script>

<div class="flex items-center gap-3 border-b border-border-default bg-surface-primary px-4 py-2.5">
  <!-- Live dot -->
  <div class="relative flex-shrink-0">
    <span class="block h-2.5 w-2.5 rounded-full {dotColor}" aria-hidden="true"></span>
    {#if status === 'ACTIVE'}
      <span
        class="absolute inset-0 animate-ping rounded-full {dotColor} opacity-75"
        aria-hidden="true"
      ></span>
    {/if}
  </div>

  <!-- Phase label -->
  <span
    class="flex-shrink-0 text-xs font-bold uppercase tracking-wider {status === 'ACTIVE'
      ? 'text-success-500'
      : status === 'WAITING'
        ? 'text-warning-500'
        : 'text-text-muted'}"
  >
    {phase}
  </span>

  <!-- Title -->
  <span class="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
    {displayTitle}
  </span>

  <!-- Metadata -->
  <div class="flex flex-shrink-0 items-center gap-3 text-sm text-text-muted">
    {#if gameStore.gameState}
      <span class="tabular-nums">
        {gameStore.gameState.currentRound}/{gameStore.gameState.totalRounds}
      </span>
    {/if}
    <span class="tabular-nums">{gameStore.participantCount} viewers</span>
    <CountdownTimer endsAt={gameStore.currentRound?.endsAt ?? null} compact />
    <!-- Connection dot -->
    <span
      class="h-2 w-2 rounded-full {gameStore.connected ? 'bg-success-500' : 'bg-danger-500'}"
      title={gameStore.connected ? 'Connected' : 'Disconnected'}
      aria-label={gameStore.connected ? 'Connected' : 'Disconnected'}
      role="status"
    ></span>
  </div>
</div>
