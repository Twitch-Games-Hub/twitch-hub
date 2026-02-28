<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { getPlaySocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game.svelte';
  import RatingSlider from '$lib/components/games/hot-take/RatingSlider.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import ConnectionIndicator from '$lib/components/ui/ConnectionIndicator.svelte';
  import { LoaderIcon } from '$lib/components/ui/icons';
  import type { Socket } from 'socket.io-client';

  let socket: Socket | null = null;
  let rating = $state(5);
  let submitted = $state(false);

  const sessionId = $derived($page.params.sessionId!);

  onMount(() => {
    socket = getPlaySocket();
    gameStore.bindSocket(socket);
    if (sessionId) gameStore.joinSession(sessionId);
  });

  onDestroy(() => {
    socket?.disconnect();
  });

  function submitRating(value: number) {
    if (!gameStore.currentRound || submitted || !sessionId) return;
    gameStore.submitResponse(sessionId, gameStore.currentRound.questionId, value);
    submitted = true;
  }

  $effect(() => {
    if (gameStore.currentRound) {
      submitted = false;
      rating = 5;
    }
  });
</script>

<svelte:head>
  <title>Play - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-8">
  <!-- Connection status -->
  <div class="mb-4 flex justify-end">
    <ConnectionIndicator connected={gameStore.connected} />
  </div>

  {#if !gameStore.connected}
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <LoaderIcon size={32} class="mb-4 text-brand-400" />
      <p class="text-text-secondary">Connecting to session...</p>
    </div>
  {:else if gameStore.finalResults}
    <div class="animate-fade-in text-center">
      <h1
        class="mb-2 bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-4xl font-bold text-transparent"
      >
        Game Over!
      </h1>
      <p class="mb-6 text-text-secondary">
        Thanks for playing! {gameStore.finalResults.totalParticipants} participants joined.
      </p>
      {#each gameStore.finalResults.rounds as round (round.round)}
        <Card padding="md" class="mb-4 text-left">
          <p class="mb-2 text-sm text-text-muted">Round {round.round}</p>
          {#if round.distribution}
            <Histogram
              distribution={round.distribution}
              totalVotes={round.totalResponses}
              compact
            />
          {/if}
        </Card>
      {/each}
    </div>
  {:else if gameStore.currentRound}
    <div class="animate-slide-up space-y-6">
      <div class="text-center">
        <p class="text-sm text-text-muted">
          Round {gameStore.gameState?.currentRound}/{gameStore.gameState?.totalRounds}
        </p>
        <h2 class="mt-2 text-2xl font-bold text-text-primary">{gameStore.currentRound.prompt}</h2>
      </div>

      {#if gameStore.roundResults}
        <Card padding="lg" class="animate-fade-in text-center">
          <h3 class="mb-3 text-lg font-semibold text-brand-400">Results</h3>
          {#if gameStore.roundResults.distribution}
            <Histogram
              distribution={gameStore.roundResults.distribution}
              totalVotes={gameStore.roundResults.totalResponses}
              compact
            />
          {/if}
        </Card>
      {:else if submitted}
        <Card padding="lg" class="animate-fade-in text-center">
          <div class="flex items-center justify-center gap-2 text-success-500">
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>Rating submitted! Waiting for results...</p>
          </div>
        </Card>
      {:else if gameStore.gameState?.gameType === 'HOT_TAKE'}
        <Card padding="lg">
          <RatingSlider bind:value={rating} onsubmit={submitRating} />
        </Card>
      {/if}

      <div class="text-center text-sm text-text-muted" role="status" aria-live="polite">
        {gameStore.participantCount} participants
      </div>
    </div>
  {:else if gameStore.gameState?.status === 'WAITING'}
    <div class="animate-fade-in py-12 text-center">
      <div class="mb-6">
        <div class="mx-auto h-16 w-16 animate-pulse rounded-full bg-brand-600/20"></div>
      </div>
      <h1 class="mb-3 text-2xl font-bold text-text-primary">Waiting for game to start...</h1>
      <p class="text-text-secondary">The streamer will start the game soon.</p>
      <div class="mt-6 tabular-nums text-sm text-text-muted" role="status" aria-live="polite">
        {gameStore.participantCount} participants waiting
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <LoaderIcon size={32} class="mb-4 text-brand-400" />
      <h1 class="mb-2 text-2xl font-bold text-text-primary">Joining session...</h1>
      <p class="text-text-secondary">Connecting to the game session.</p>
    </div>
  {/if}
</div>
