<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import type { ApiGameBase } from '@twitch-hub/shared-types';
  import SessionStatusBar from './SessionStatusBar.svelte';
  import SessionShareLinks from './SessionShareLinks.svelte';
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
  <!-- Status Bar (always visible when session active) -->
  {#if gameStore.gameState}
    <SessionStatusBar title={game.title} />
  {/if}

  <div class="space-y-4 p-4">
    <SessionShareLinks {sessionId} {appUrl} />

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

      <ConnectedUsersTable users={gameStore.connectedUsers} />

      <SessionControls {onStartGame} {onNextRound} {onEndGame} />
    {:else if phase === 'live'}
      <!-- Live Phase -->
      {#if gameStore.votes}
        <div class="rounded-lg bg-surface-tertiary p-4">
          <p class="mb-2 text-xs text-text-muted">
            Live Distribution ({gameStore.votes.totalVotes} votes)
          </p>
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

      <ConnectedUsersTable users={gameStore.connectedUsers} />
    {:else}
      <!-- Results Phase -->
      {#if gameStore.finalResults}
        <SessionResults finalResults={gameStore.finalResults} {game} />
      {/if}
    {/if}
  </div>
</div>
