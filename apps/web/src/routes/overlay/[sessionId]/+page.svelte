<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { getOverlaySocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import type { Socket } from 'socket.io-client';

  let socket: Socket | null = null;

  const sessionId = $derived($page.params.sessionId!);

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
    html, body {
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
          <p class="text-sm font-medium text-purple-400">
            Round {gameStore.gameState?.currentRound}/{gameStore.gameState?.totalRounds}
          </p>
          <h2 class="mt-1 text-2xl font-bold text-white">{gameStore.currentRound.prompt}</h2>
        </div>
      </div>

      <!-- Histogram -->
      {#if gameStore.votes}
        <div class="rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
          <Histogram
            distribution={gameStore.votes.distribution}
            totalVotes={gameStore.votes.totalVotes}
          />
        </div>
      {/if}

      <!-- Participant Count -->
      <div class="mt-3 text-center">
        <span class="rounded-full bg-purple-600/80 px-4 py-1 text-sm font-medium text-white backdrop-blur-sm">
          {gameStore.participantCount} participants
        </span>
      </div>
    </div>
  {:else if gameStore.roundResults}
    <div class="w-full max-w-2xl">
      <div class="rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
        <h3 class="mb-4 text-center text-xl font-bold text-purple-400">Round Results</h3>
        {#if gameStore.roundResults.distribution}
          <Histogram
            distribution={gameStore.roundResults.distribution}
            totalVotes={gameStore.roundResults.totalResponses}
          />
        {/if}
      </div>
    </div>
  {:else if gameStore.finalResults}
    <div class="w-full max-w-md">
      <div class="rounded-2xl bg-black/70 p-8 text-center backdrop-blur-sm">
        <h2 class="text-3xl font-bold text-purple-400">Game Over!</h2>
        <p class="mt-2 text-lg text-gray-300">
          {gameStore.finalResults.totalParticipants} participants
        </p>
      </div>
    </div>
  {:else if gameStore.gameState?.status === 'WAITING'}
    <div class="w-full max-w-md">
      <div class="rounded-2xl bg-black/70 p-6 text-center backdrop-blur-sm">
        <h2 class="text-2xl font-bold text-white">Starting Soon...</h2>
        <p class="mt-2 text-gray-400">{gameStore.participantCount} waiting</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .overlay-container {
    font-family: 'Inter', system-ui, sans-serif;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.4s ease-out;
  }
</style>
