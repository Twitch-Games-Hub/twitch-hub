<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { getOverlaySocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import TugOfWar from '$lib/components/overlay/TugOfWar.svelte';
  import { countsToPercents, extractBinaryPercents } from '$lib/utils/votes';
  import Leaderboard from '$lib/components/overlay/Leaderboard.svelte';
  import CountdownTimer from '$lib/components/ui/CountdownTimer.svelte';
  import type { Socket } from 'socket.io-client';

  let socket: Socket | null = null;

  const sessionId = $derived($page.params.sessionId!);
  const gameType = $derived(gameStore.gameState?.gameType);

  onMount(() => {
    socket = getOverlaySocket();
    gameStore.bindSocket(socket);
    if (sessionId) gameStore.joinSession(sessionId);
  });

  onDestroy(() => {
    socket?.disconnect();
  });
</script>

<svelte:head>
  <title>Overlay</title>
  <style>
    html,
    body {
      background: transparent !important;
      overflow: hidden;
    }
  </style>
</svelte:head>

<div class="overlay-container fixed inset-0 flex items-end justify-center p-8">
  {#if gameStore.currentRound}
    <div class="w-full max-w-2xl animate-slide-up">
      <!-- Current Statement -->
      <div class="mb-4 text-center">
        <div class="inline-block rounded-2xl bg-black/70 px-8 py-4 backdrop-blur-sm">
          <p class="text-sm font-medium tabular-nums text-brand-400">
            Round {gameStore.gameState?.currentRound}/{gameStore.gameState?.totalRounds}
            {#if gameStore.currentRound?.endsAt}
              <span class="ml-2">
                <CountdownTimer endsAt={gameStore.currentRound.endsAt} compact />
              </span>
            {/if}
          </p>
          <h2 class="mt-1 text-2xl font-bold text-white">{gameStore.currentRound.prompt}</h2>
        </div>
      </div>

      <!-- Live Visualization -->
      {#if gameStore.votes}
        <div class="animate-fade-in rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
          {#if gameStore.votes.distribution.length === 2 && (gameType === 'BALANCE' || gameType === 'RANKING')}
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

      <!-- Participant Count -->
      <div class="mt-3 text-center" role="status" aria-live="polite">
        <span
          class="rounded-full bg-brand-600/80 px-4 py-1 text-sm font-medium tabular-nums text-white backdrop-blur-sm"
        >
          {gameStore.participantCount} participants
        </span>
      </div>
    </div>
  {:else if gameStore.roundResults}
    <div class="w-full max-w-2xl animate-fade-in">
      <div class="rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
        <h3 class="mb-4 text-center text-xl font-bold text-brand-400">Round Results</h3>
        {#if gameType === 'BLIND_TEST' && gameStore.roundResults.percentages}
          <Leaderboard
            entries={Object.entries(gameStore.roundResults.percentages).map(([userId, score]) => ({
              userId,
              score,
            }))}
            title="Leaderboard"
          />
        {:else if (gameType === 'BALANCE' || gameType === 'RANKING') && extractBinaryPercents(gameStore.roundResults)}
          {@const split = extractBinaryPercents(gameStore.roundResults)!}
          <TugOfWar
            percentA={split.percentA}
            percentB={split.percentB}
            labelA="A"
            labelB="B"
            totalVotes={split.totalVotes}
          />
        {:else if gameStore.roundResults.distribution}
          <Histogram
            distribution={gameStore.roundResults.distribution}
            totalVotes={gameStore.roundResults.totalResponses}
          />
        {/if}
      </div>
    </div>
  {:else if gameStore.finalResults}
    <div class="w-full max-w-md animate-fade-in">
      <div class="rounded-2xl bg-black/70 p-8 text-center backdrop-blur-sm">
        <h2
          class="bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-3xl font-bold text-transparent"
        >
          Game Over!
        </h2>
        <p class="mt-2 text-lg tabular-nums text-text-secondary">
          {gameStore.finalResults.totalParticipants} participants
        </p>
      </div>
    </div>
  {:else if gameStore.gameState?.status === 'LOBBY'}
    <div class="w-full max-w-md animate-fade-in">
      <div class="rounded-2xl bg-black/70 p-6 text-center backdrop-blur-sm">
        <div class="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-brand-600/40"></div>
        <h2 class="text-2xl font-bold text-white">Starting Soon...</h2>
        <p class="mt-2 tabular-nums text-text-muted" role="status" aria-live="polite">
          {gameStore.participantCount} waiting
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .overlay-container {
    font-family: 'Inter', system-ui, sans-serif;
  }
</style>
