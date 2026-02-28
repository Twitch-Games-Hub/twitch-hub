<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { getPlaySocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game';
  import RatingSlider from '$lib/components/games/hot-take/RatingSlider.svelte';
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

  // Reset submitted state on new round
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
  {#if !gameStore.connected}
    <div class="text-center text-gray-400">Connecting...</div>
  {:else if gameStore.finalResults}
    <div class="text-center">
      <h1 class="mb-4 text-3xl font-bold text-purple-400">Game Over!</h1>
      <p class="text-gray-300">
        Thanks for playing! {gameStore.finalResults.totalParticipants} participants joined.
      </p>
      {#each gameStore.finalResults.rounds as round}
        <div class="mt-4 rounded-lg bg-gray-900 p-4 text-left">
          <p class="mb-2 text-sm text-gray-400">Round {round.round}</p>
          {#if round.distribution}
            <div class="flex items-end gap-1" style="height: 60px;">
              {#each round.distribution as count}
                {@const max = Math.max(...round.distribution, 1)}
                <div class="flex-1 rounded-t bg-purple-500" style="height: {(count / max) * 100}%"></div>
              {/each}
            </div>
          {/if}
          <p class="mt-1 text-xs text-gray-500">{round.totalResponses} responses</p>
        </div>
      {/each}
    </div>
  {:else if gameStore.currentRound}
    <div class="space-y-6">
      <div class="text-center">
        <p class="text-sm text-gray-500">
          Round {gameStore.gameState?.currentRound}/{gameStore.gameState?.totalRounds}
        </p>
        <h2 class="mt-2 text-2xl font-bold">{gameStore.currentRound.prompt}</h2>
      </div>

      {#if gameStore.roundResults}
        <div class="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
          <h3 class="mb-3 text-lg font-semibold text-purple-400">Results</h3>
          {#if gameStore.roundResults.distribution}
            <div class="flex items-end justify-center gap-1" style="height: 100px;">
              {#each gameStore.roundResults.distribution as count, i}
                {@const max = Math.max(...gameStore.roundResults.distribution!, 1)}
                <div class="flex flex-col items-center">
                  <div
                    class="w-8 rounded-t bg-purple-500"
                    style="height: {(count / max) * 80}px"
                  ></div>
                  <span class="mt-1 text-xs text-gray-500">{i + 1}</span>
                </div>
              {/each}
            </div>
          {/if}
          <p class="mt-2 text-sm text-gray-400">{gameStore.roundResults.totalResponses} responses</p>
        </div>
      {:else if submitted}
        <div class="rounded-xl border border-green-800 bg-green-900/20 p-6 text-center">
          <p class="text-green-400">Rating submitted! Waiting for results...</p>
        </div>
      {:else}
        {#if gameStore.gameState?.gameType === 'HOT_TAKE'}
          <RatingSlider bind:value={rating} onsubmit={submitRating} />
        {/if}
      {/if}

      <div class="text-center text-sm text-gray-500">
        {gameStore.participantCount} participants
      </div>
    </div>
  {:else if gameStore.gameState?.status === 'WAITING'}
    <div class="text-center">
      <h1 class="mb-4 text-2xl font-bold">Waiting for game to start...</h1>
      <p class="text-gray-400">The streamer will start the game soon.</p>
      <div class="mt-6 text-sm text-gray-500">
        {gameStore.participantCount} participants waiting
      </div>
    </div>
  {:else}
    <div class="text-center">
      <h1 class="mb-4 text-2xl font-bold">Joining session...</h1>
      <p class="text-gray-400">Connecting to the game session.</p>
    </div>
  {/if}
</div>
