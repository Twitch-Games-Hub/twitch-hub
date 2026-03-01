<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import type { ApiGameBase } from '@twitch-hub/shared-types';
  import SessionStatusBar from './SessionStatusBar.svelte';
  import PlayShareCard from './PlayShareCard.svelte';
  import SessionControls from './SessionControls.svelte';
  import ConnectedUsersTable from './ConnectedUsersTable.svelte';
  import SessionResults from './SessionResults.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import TugOfWar from '$lib/components/overlay/TugOfWar.svelte';
  import { countsToPercents } from '$lib/utils/votes';

  let {
    game,
    sessionId,
    appUrl,
    onStartGame,
    onNextRound,
    onEndGame,
  }: {
    game: ApiGameBase;
    sessionId: string;
    appUrl: string;
    onStartGame: () => void;
    onNextRound: () => void;
    onEndGame: () => void;
  } = $props();

  const phase = $derived<'lobby' | 'live' | 'results'>(
    gameStore.finalResults ? 'results' : gameStore.gameState?.status === 'LIVE' ? 'live' : 'lobby',
  );

  const isBinaryVote = $derived(
    gameStore.votes &&
      gameStore.votes.distribution.length === 2 &&
      (game.type === 'BALANCE' || game.type === 'RANKING'),
  );
</script>

<div class="overflow-hidden rounded-xl border border-border-default bg-surface-secondary">
  <!-- Status Bar -->
  {#if gameStore.gameState}
    <SessionStatusBar title={game.title} />
  {/if}

  <div class="p-4">
    {#if phase === 'lobby'}
      <!-- Lobby Phase: two-column -->
      <div class="grid gap-4 lg:grid-cols-3">
        <!-- Left: waiting state + controls -->
        <div class="space-y-4 lg:col-span-2">
          <div
            class="flex flex-col items-center justify-center rounded-lg bg-surface-tertiary/50 py-10"
          >
            <div class="relative mx-auto mb-4 h-16 w-16">
              <div class="absolute inset-0 animate-ping rounded-full bg-brand-600/20"></div>
              <div class="absolute inset-1 animate-pulse rounded-full bg-brand-600/30"></div>
              <div class="absolute inset-3 rounded-full bg-brand-600/50"></div>
            </div>
            <h3 class="text-xl font-bold text-text-primary">Waiting for Players</h3>
            <p class="mt-1 text-sm text-text-muted">Share the link to let participants join</p>
            <p
              class="mt-4 tabular-nums text-3xl font-bold text-brand-400"
              role="status"
              aria-live="polite"
            >
              {gameStore.connectedUsers.length}
              <span class="text-sm font-normal text-text-muted">connected</span>
            </p>
          </div>

          <SessionControls {onStartGame} {onNextRound} {onEndGame} />
        </div>

        <!-- Right: share + players -->
        <div class="space-y-4">
          <PlayShareCard {sessionId} {appUrl} />
          <ConnectedUsersTable users={gameStore.connectedUsers} />
        </div>
      </div>
    {:else if phase === 'live'}
      <!-- Live Phase: two-column -->
      <div class="grid gap-4 lg:grid-cols-3">
        <!-- Left: viz + controls -->
        <div class="space-y-4 lg:col-span-2">
          {#if gameStore.votes}
            <div class="rounded-lg bg-surface-tertiary p-4">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-sm font-semibold text-text-primary">Live Votes</span>
                <span
                  class="rounded-md bg-brand-900/40 px-2 py-0.5 text-xs tabular-nums text-brand-400"
                >
                  {gameStore.votes.totalVotes} votes
                </span>
              </div>
              {#if isBinaryVote}
                {@const [pA, pB] = countsToPercents(
                  gameStore.votes.distribution[0],
                  gameStore.votes.distribution[1],
                )}
                <TugOfWar
                  percentA={pA}
                  percentB={pB}
                  labelA={gameStore.currentRound?.options?.[0] ?? 'A'}
                  labelB={gameStore.currentRound?.options?.[1] ?? 'B'}
                  totalVotes={gameStore.votes.totalVotes}
                  imageA={gameStore.currentRound?.optionImages?.[0]}
                  imageB={gameStore.currentRound?.optionImages?.[1]}
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
        </div>

        <!-- Right: share + players -->
        <div class="space-y-4">
          <PlayShareCard {sessionId} {appUrl} />
          <ConnectedUsersTable users={gameStore.connectedUsers} />
        </div>
      </div>
    {:else}
      <!-- Results Phase -->
      {#if gameStore.finalResults}
        <SessionResults finalResults={gameStore.finalResults} {game} />
      {/if}
    {/if}
  </div>
</div>
