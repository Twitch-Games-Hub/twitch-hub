<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { apiGet, apiPut } from '$lib/api';
  import { getDashboardSocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import {
    GameStatus,
    type ApiGame,
    type GameType,
    type HotTakeConfig,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import type { Socket } from 'socket.io-client';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import CopyButton from '$lib/components/ui/CopyButton.svelte';
  import ConnectionIndicator from '$lib/components/ui/ConnectionIndicator.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let game = $state<ApiGame | null>(null);
  let sessionId = $state<string | null>(null);
  let loading = $state(true);
  let socket: Socket | null = null;

  const gameId = $derived($page.params.gameId);
  const appUrl = $derived(typeof window !== 'undefined' ? window.location.origin : '');

  onMount(async () => {
    try {
      game = await apiGet<ApiGame>(`/api/games/${gameId}`);
    } catch {
      toastStore.add('Failed to load game', 'error');
    } finally {
      loading = false;
    }

    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('session='))
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
    try {
      await apiPut(`/api/games/${gameId}`, { ...game, status: GameStatus.READY });
      game = { ...game, status: GameStatus.READY };
      toastStore.add('Game marked as ready', 'success');
    } catch {
      toastStore.add('Failed to update game status', 'error');
    }
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
    <div class="space-y-6">
      <Skeleton width="300px" height="2.5rem" />
      <Skeleton height="1rem" width="150px" />
      <Skeleton height="10rem" rounded="rounded-xl" />
      <Skeleton height="16rem" rounded="rounded-xl" />
    </div>
  {:else if game}
    <PageHeader
      title={game.title}
      subtitle={GAME_TYPE_META[game.type as GameType]?.label || game.type}
      back="/dashboard"
    >
      {#snippet action()}
        <div class="flex items-center gap-3">
          <StatusBadge status={game.status} />
          {#if game.status === 'DRAFT'}
            <Button onclick={markReady} variant="secondary">Mark as Ready</Button>
          {/if}
        </div>
      {/snippet}
    </PageHeader>

    <!-- Game Config Preview -->
    {#if game.type === 'HOT_TAKE'}
      {@const config = getHotTakeConfig(game)}
      {#if config}
        <Card padding="md" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-text-primary">
            Statements ({config.statements.length})
          </h2>
          <ol class="list-inside list-decimal space-y-1 text-text-secondary">
            {#each config.statements as statement, i (i)}
              <li>{statement}</li>
            {/each}
          </ol>
        </Card>
      {/if}
    {/if}

    <!-- Session Controls -->
    <Card padding="lg">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-text-primary">Live Session</h2>
        {#if sessionId}
          <ConnectionIndicator connected={gameStore.connected} />
        {/if}
      </div>

      {#if !sessionId}
        <Button onclick={createSession} disabled={game.status !== 'READY'}>
          Start Live Session
        </Button>
        {#if game.status !== 'READY'}
          <p class="mt-2 text-sm text-text-muted">Mark the game as Ready first.</p>
        {/if}
      {:else}
        <div class="space-y-4">
          <!-- Session Links -->
          <div class="rounded-lg bg-surface-tertiary p-3">
            <p class="mb-1 text-xs text-text-muted">Play Link</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 truncate text-sm text-brand-400">
                {appUrl}/play/{sessionId}
              </code>
              <CopyButton value="{appUrl}/play/{sessionId}" />
            </div>
          </div>
          <div class="rounded-lg bg-surface-tertiary p-3">
            <p class="mb-1 text-xs text-text-muted">OBS Overlay</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 truncate text-sm text-brand-400">
                {appUrl}/overlay/{sessionId}
              </code>
              <CopyButton value="{appUrl}/overlay/{sessionId}" />
            </div>
          </div>

          <!-- Live Stats -->
          <div class="flex flex-wrap gap-4">
            <div class="rounded-lg bg-surface-tertiary px-4 py-2">
              <p class="text-xs text-text-muted">Participants</p>
              <p
                class="text-2xl font-bold tabular-nums text-brand-400"
                role="status"
                aria-live="polite"
              >
                {gameStore.participantCount}
              </p>
            </div>
            <div class="rounded-lg bg-surface-tertiary px-4 py-2">
              <p class="text-xs text-text-muted">Round</p>
              <p class="text-2xl font-bold tabular-nums text-brand-400">
                {gameStore.gameState?.currentRound || 0}/{gameStore.gameState?.totalRounds || '?'}
              </p>
            </div>
          </div>

          <!-- Live Votes -->
          {#if gameStore.votes}
            <div class="rounded-lg bg-surface-tertiary p-4">
              <p class="mb-2 text-xs text-text-muted">
                Live Distribution ({gameStore.votes.totalVotes} votes)
              </p>
              <Histogram
                distribution={gameStore.votes.distribution}
                totalVotes={gameStore.votes.totalVotes}
              />
            </div>
          {/if}

          <!-- Controls -->
          <div class="flex flex-wrap gap-3">
            {#if !gameStore.gameState || gameStore.gameState.status === 'WAITING'}
              <Button onclick={startGame} variant="secondary">Start Game</Button>
            {:else if gameStore.gameState.status === 'ACTIVE'}
              <Button onclick={nextRound} variant="secondary">Next Round</Button>
              <Button onclick={endGame} variant="danger">End Game</Button>
            {/if}
          </div>

          <!-- Final Results -->
          {#if gameStore.finalResults}
            <div class="rounded-lg border border-success-500/20 bg-success-900/20 p-4">
              <h3 class="mb-2 font-semibold text-success-500">Game Complete</h3>
              <p class="text-sm text-text-secondary">
                Total participants: {gameStore.finalResults.totalParticipants}
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </Card>
  {:else}
    <EmptyState title="Game not found" description="This game doesn't exist or has been deleted.">
      {#snippet action()}
        <Button href="/dashboard">Back to Dashboard</Button>
      {/snippet}
    </EmptyState>
  {/if}
</div>
