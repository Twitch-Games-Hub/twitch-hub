<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { apiGet, apiPut } from '$lib/api';
  import { getDashboardSocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game';
  import { GameStatus, type ApiGame, type HotTakeConfig } from '@twitch-hub/shared-types';
  import type { Socket } from 'socket.io-client';

  let game = $state<ApiGame | null>(null);
  let sessionId = $state<string | null>(null);
  let loading = $state(true);
  let socket: Socket | null = null;

  const gameId = $derived($page.params.gameId);
  const appUrl = $derived(typeof window !== 'undefined' ? window.location.origin : '');

  onMount(async () => {
    try {
      game = await apiGet<ApiGame>(`/api/games/${gameId}`);
    } catch (err) {
      console.error('Failed to load game:', err);
    } finally {
      loading = false;
    }

    // Get session token from cookie for socket auth
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    if (token) {
      socket = getDashboardSocket(token);
      gameStore.bindSocket(socket);

      socket.on('session:created', (data: { sessionId: string }) => {
        sessionId = data.sessionId;
        socket?.emit('session:join' as never, sessionId as never);
      });
    }
  });

  onDestroy(() => {
    socket?.disconnect();
  });

  function createSession() {
    if (gameId) gameStore.createSession(gameId);
  }

  function startGame() {
    if (sessionId) gameStore.startGame(sessionId);
  }

  function nextRound() {
    if (sessionId) gameStore.nextRound(sessionId);
  }

  function endGame() {
    if (sessionId) gameStore.endGame(sessionId);
  }

  async function markReady() {
    if (!game) return;
    await apiPut(`/api/games/${gameId}`, { ...game, status: GameStatus.READY });
    game = { ...game, status: GameStatus.READY };
  }

  function getHotTakeConfig(g: ApiGame): HotTakeConfig | null {
    if (g.type !== 'HOT_TAKE') return null;
    return g.config as HotTakeConfig;
  }
</script>

<svelte:head>
  <title>{game?.title || 'Game'} - Dashboard</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8">
  {#if loading}
    <p class="text-gray-400">Loading...</p>
  {:else if game}
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">{game.title}</h1>
        <p class="text-gray-400">{game.type.replace('_', ' ')}</p>
      </div>
      {#if game.status === 'DRAFT'}
        <button
          onclick={markReady}
          class="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          Mark as Ready
        </button>
      {/if}
    </div>

    <!-- Game Config Preview -->
    {#if game.type === 'HOT_TAKE'}
      {@const config = getHotTakeConfig(game)}
      {#if config}
        <div class="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 class="mb-3 text-lg font-semibold">Statements ({config.statements.length})</h2>
          <ol class="list-inside list-decimal space-y-1 text-gray-300">
            {#each config.statements as statement}
              <li>{statement}</li>
            {/each}
          </ol>
        </div>
      {/if}
    {/if}

    <!-- Session Controls -->
    <div class="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-4 text-lg font-semibold">Live Session</h2>

      {#if !sessionId}
        <button
          onclick={createSession}
          disabled={game.status !== 'READY'}
          class="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          Start Live Session
        </button>
        {#if game.status !== 'READY'}
          <p class="mt-2 text-sm text-gray-500">Mark the game as Ready first.</p>
        {/if}
      {:else}
        <div class="space-y-4">
          <!-- Session Links -->
          <div class="rounded-lg bg-gray-800 p-3">
            <p class="mb-1 text-xs text-gray-500">Play Link</p>
            <code class="text-sm text-purple-400">{appUrl}/play/{sessionId}</code>
          </div>
          <div class="rounded-lg bg-gray-800 p-3">
            <p class="mb-1 text-xs text-gray-500">OBS Overlay</p>
            <code class="text-sm text-purple-400">{appUrl}/overlay/{sessionId}</code>
          </div>

          <!-- Live Stats -->
          <div class="flex gap-4">
            <div class="rounded-lg bg-gray-800 px-4 py-2">
              <p class="text-xs text-gray-500">Participants</p>
              <p class="text-2xl font-bold text-purple-400">{gameStore.participantCount}</p>
            </div>
            <div class="rounded-lg bg-gray-800 px-4 py-2">
              <p class="text-xs text-gray-500">Round</p>
              <p class="text-2xl font-bold text-purple-400">
                {gameStore.gameState?.currentRound || 0}/{gameStore.gameState?.totalRounds || '?'}
              </p>
            </div>
          </div>

          <!-- Live Votes -->
          {#if gameStore.votes}
            <div class="rounded-lg bg-gray-800 p-3">
              <p class="mb-2 text-xs text-gray-500">Live Distribution ({gameStore.votes.totalVotes} votes)</p>
              <div class="flex items-end gap-1" style="height: 80px;">
                {#each gameStore.votes.distribution as count, i}
                  {@const max = Math.max(...gameStore.votes!.distribution, 1)}
                  <div class="flex flex-1 flex-col items-center">
                    <div
                      class="w-full rounded-t bg-purple-500"
                      style="height: {(count / max) * 100}%"
                    ></div>
                    <span class="mt-1 text-xs text-gray-500">{i + 1}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Controls -->
          <div class="flex gap-3">
            {#if !gameStore.gameState || gameStore.gameState.status === 'WAITING'}
              <button
                onclick={startGame}
                class="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                Start Game
              </button>
            {:else if gameStore.gameState.status === 'ACTIVE'}
              <button
                onclick={nextRound}
                class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                Next Round
              </button>
              <button
                onclick={endGame}
                class="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                End Game
              </button>
            {/if}
          </div>

          <!-- Final Results -->
          {#if gameStore.finalResults}
            <div class="rounded-lg border border-green-800 bg-green-900/20 p-4">
              <h3 class="mb-2 font-semibold text-green-400">Game Complete</h3>
              <p class="text-sm text-gray-300">
                Total participants: {gameStore.finalResults.totalParticipants}
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-red-400">Game not found.</p>
  {/if}
</div>
