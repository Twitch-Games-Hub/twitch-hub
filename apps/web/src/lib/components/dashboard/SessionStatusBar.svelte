<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import CountdownTimer from '$lib/components/ui/CountdownTimer.svelte';
  import { UsersIcon } from '$lib/components/ui/icons';

  let { title }: { title: string } = $props();

  const status = $derived(gameStore.gameState?.status);
  const phase = $derived(status === 'LIVE' ? 'LIVE' : status === 'LOBBY' ? 'LOBBY' : 'ENDED');
  const displayTitle = $derived(gameStore.currentRound?.prompt ?? title);

  const phasePill = $derived(
    status === 'LIVE'
      ? 'bg-success-900/50 text-success-500 border border-success-500/20'
      : status === 'LOBBY'
        ? 'bg-warning-900/50 text-warning-500 border border-warning-500/20'
        : 'bg-surface-elevated text-text-muted border border-border-subtle',
  );

  const playerCount = $derived(gameStore.connectedUsers.length);
  const voterCount = $derived(gameStore.participantCount);
</script>

<div class="flex items-center gap-3 border-b border-border-default bg-surface-primary px-4 py-2.5">
  <!-- Phase pill -->
  <span
    class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider {phasePill}"
  >
    {#if status === 'LIVE'}
      <span class="relative flex h-2 w-2">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75"
        ></span>
        <span class="relative inline-flex h-2 w-2 rounded-full bg-success-500"></span>
      </span>
    {/if}
    {phase}
  </span>

  <!-- Title -->
  <span class="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
    {displayTitle}
  </span>

  <!-- Metadata pills -->
  <div class="flex flex-shrink-0 items-center gap-2 text-xs">
    {#if gameStore.gameState}
      <span class="rounded-md bg-surface-tertiary px-2 py-0.5 tabular-nums text-text-muted">
        {gameStore.gameState.currentRound}/{gameStore.gameState.totalRounds}
      </span>
    {/if}

    <span
      class="inline-flex items-center gap-1 rounded-md bg-surface-tertiary px-2 py-0.5 tabular-nums text-text-muted"
    >
      <UsersIcon size={12} />
      {playerCount}
    </span>

    {#if voterCount > 0}
      <span class="rounded-md bg-brand-900/40 px-2 py-0.5 tabular-nums text-brand-400">
        {voterCount} voted
      </span>
    {/if}

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
