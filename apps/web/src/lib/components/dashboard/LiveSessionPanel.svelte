<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import type { ApiGame } from '@twitch-hub/shared-types';
  import SessionStatusBar from './SessionStatusBar.svelte';
  import SessionShareLinks from './SessionShareLinks.svelte';
  import SessionControls from './SessionControls.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import SplitBar from '$lib/components/overlay/SplitBar.svelte';

  let {
    game,
    sessionId,
    appUrl,
    onStartGame,
    onNextRound,
    onEndGame,
  }: {
    game: ApiGame;
    sessionId: string;
    appUrl: string;
    onStartGame: () => void;
    onNextRound: () => void;
    onEndGame: () => void;
  } = $props();

  const phase = $derived<'lobby' | 'live' | 'results'>(
    gameStore.finalResults
      ? 'results'
      : gameStore.gameState?.status === 'ACTIVE'
        ? 'live'
        : 'lobby',
  );

  const isSplitBar = $derived(
    gameStore.votes &&
      gameStore.votes.distribution.length === 2 &&
      (game.type === 'BALANCE' || game.type === 'BRACKET'),
  );
</script>

<div class="overflow-hidden rounded-xl border border-border-default bg-surface-secondary">
  <!-- Status Bar (always visible when session active) -->
  {#if gameStore.gameState}
    <SessionStatusBar title={game.title} />
  {/if}

  <div class="space-y-4 p-4">
    {#if phase === 'lobby'}
      <!-- Lobby Phase -->
      <div class="py-4 text-center">
        <div class="mx-auto mb-3 h-12 w-12 animate-pulse rounded-full bg-brand-600/20"></div>
        <h3 class="text-lg font-semibold text-text-primary">Waiting for players</h3>
        <p class="mt-1 text-sm text-text-muted">Share the links below to let participants join.</p>
        <p
          class="mt-3 tabular-nums text-2xl font-bold text-brand-400"
          role="status"
          aria-live="polite"
        >
          {gameStore.participantCount}
          <span class="text-sm font-normal text-text-muted">participants</span>
        </p>
      </div>

      <SessionShareLinks {sessionId} {appUrl} />

      <SessionControls {onStartGame} {onNextRound} {onEndGame} />
    {:else if phase === 'live'}
      <!-- Live Phase -->
      {#if gameStore.votes}
        <div class="rounded-lg bg-surface-tertiary p-4">
          <p class="mb-2 text-xs text-text-muted">
            Live Distribution ({gameStore.votes.totalVotes} votes)
          </p>
          {#if isSplitBar}
            <SplitBar
              percentA={gameStore.votes.distribution[0]}
              percentB={gameStore.votes.distribution[1]}
              labelA={gameStore.currentRound?.options?.[0] ?? 'A'}
              labelB={gameStore.currentRound?.options?.[1] ?? 'B'}
              totalVotes={gameStore.votes.totalVotes}
            />
          {:else}
            <Histogram
              distribution={gameStore.votes.distribution}
              totalVotes={gameStore.votes.totalVotes}
            />
          {/if}
        </div>
      {/if}

      <SessionControls {onStartGame} {onNextRound} {onEndGame} />

      <SessionShareLinks {sessionId} {appUrl} />
    {:else}
      <!-- Results Phase -->
      <div class="rounded-lg border border-success-500/20 bg-success-900/20 p-6 text-center">
        <h3 class="text-lg font-semibold text-success-500">Game Complete</h3>
        <p class="mt-1 text-sm text-text-secondary">
          Total participants: {gameStore.finalResults?.totalParticipants ?? 0}
        </p>
      </div>
    {/if}
  </div>
</div>
