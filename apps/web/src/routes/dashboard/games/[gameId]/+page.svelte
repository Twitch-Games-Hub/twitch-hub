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
    type BalanceConfig,
    type BracketConfig,
    type PersonalityConfig,
    type TierListConfig,
    type BlindTestConfig,
    type SessionSnapshot,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import type { Socket } from 'socket.io-client';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import LiveSessionPanel from '$lib/components/dashboard/LiveSessionPanel.svelte';

  let game = $state<ApiGame | null>(null);
  let sessionId = $state<string | null>(null);
  let loading = $state(true);
  let socket: Socket | null = null;

  const gameId = $derived($page.params.gameId);
  const appUrl = $derived(typeof window !== 'undefined' ? window.location.origin : '');

  function tryRejoin() {
    if (gameId && socket?.connected) {
      gameStore.rejoinSession(gameId);
    }
  }

  onMount(async () => {
    try {
      game = await apiGet<ApiGame>(`/api/games/${gameId}`);
    } catch {
      toastStore.add('Failed to load game', 'error');
    } finally {
      loading = false;
    }

    // Check if there's an active session to rejoin
    const hasActiveSession = game?.sessions?.some(
      (s: { status: string }) => s.status === 'WAITING' || s.status === 'ACTIVE',
    );

    try {
      const res = await fetch('/api/auth/token');
      if (res.ok) {
        const { token } = await res.json();
        socket = getDashboardSocket(token);
        gameStore.bindSocket(socket);

        socket.on('session:created', (data: { sessionId: string }) => {
          sessionId = data.sessionId;
          socket?.emit('session:join' as never, sessionId as never);
        });

        socket.on('session:rejoined', (snapshot: SessionSnapshot) => {
          sessionId = snapshot.sessionId;
          gameStore.hydrateFromSnapshot(snapshot);
        });

        // Auto-rejoin if there's an active session
        if (hasActiveSession) {
          if (socket.connected) {
            tryRejoin();
          } else {
            socket.once('connect', tryRejoin);
          }
        }

        // Re-rejoin on reconnect
        socket.on('connect', () => {
          if (sessionId) {
            tryRejoin();
          }
        });
      }
    } catch {
      toastStore.add('Failed to connect to game server', 'error');
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
      {@const config = game.config as HotTakeConfig}
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
    {:else if game.type === 'BALANCE'}
      {@const config = game.config as BalanceConfig}
      {#if config?.questions}
        <Card padding="md" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-text-primary">
            Questions ({config.questions.length})
          </h2>
          <ol class="list-inside list-decimal space-y-2 text-text-secondary">
            {#each config.questions as q, i (i)}
              <li class="flex items-center gap-2 flex-wrap">
                {#if q.imageUrlA}
                  <img
                    src={q.imageUrlA}
                    alt={q.optionA}
                    loading="lazy"
                    class="h-8 w-8 rounded object-cover inline-block"
                    onerror={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                {/if}
                {q.optionA} <span class="text-text-muted">vs</span>
                {#if q.imageUrlB}
                  <img
                    src={q.imageUrlB}
                    alt={q.optionB}
                    loading="lazy"
                    class="h-8 w-8 rounded object-cover inline-block"
                    onerror={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                {/if}
                {q.optionB}
              </li>
            {/each}
          </ol>
        </Card>
      {/if}
    {:else if game.type === 'BRACKET'}
      {@const config = game.config as BracketConfig}
      {#if config?.items}
        <Card padding="md" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-text-primary">
            Bracket ({config.items.length} items, size {config.bracketSize})
          </h2>
          <ul class="list-inside list-disc space-y-1 text-text-secondary">
            {#each config.items as item, i (i)}
              <li class="flex items-center gap-2">
                {#if item.imageUrl}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    class="h-6 w-6 rounded object-cover"
                    onerror={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                {/if}
                {item.name}
              </li>
            {/each}
          </ul>
        </Card>
      {/if}
    {:else if game.type === 'PERSONALITY'}
      {@const config = game.config as PersonalityConfig}
      {#if config?.questions}
        <Card padding="md" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-text-primary">
            Questions ({config.questions.length})
          </h2>
          <div class="space-y-3">
            {#each config.questions as q, i (i)}
              <div>
                <p class="font-medium text-text-primary">{i + 1}. {q.text}</p>
                <ul class="ml-4 mt-1 list-inside list-disc text-sm text-text-secondary">
                  {#each q.options as opt}
                    <li>{opt.label}</li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
          {#if config.resultTypes?.length}
            <div class="mt-4 border-t border-border-default pt-3">
              <p class="mb-1 text-sm font-medium text-text-muted">Result Types</p>
              <ul class="list-inside list-disc text-sm text-text-secondary">
                {#each config.resultTypes as rt}
                  <li>{rt.title} — {rt.description}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </Card>
      {/if}
    {:else if game.type === 'TIER_LIST'}
      {@const config = game.config as TierListConfig}
      {#if config?.items}
        <Card padding="md" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-text-primary">
            Tier List ({config.items.length} items)
          </h2>
          <p class="mb-2 text-sm text-text-muted">
            Tiers: {config.tiers.join(', ')}
          </p>
          <ul class="list-inside list-disc space-y-1 text-text-secondary">
            {#each config.items as item, i (i)}
              <li class="flex items-center gap-2">
                {#if item.imageUrl}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    class="h-6 w-6 rounded object-cover"
                    onerror={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                {/if}
                {item.name}
              </li>
            {/each}
          </ul>
        </Card>
      {/if}
    {:else if game.type === 'BLIND_TEST'}
      {@const config = game.config as BlindTestConfig}
      {#if config?.rounds}
        <Card padding="md" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-text-primary">
            Rounds ({config.rounds.length}) — {config.answerWindowSec}s per round
          </h2>
          <ol class="list-inside list-decimal space-y-1 text-text-secondary">
            {#each config.rounds as round, i (i)}
              <li class="flex items-center gap-2">
                {#if round.imageUrl}
                  <img
                    src={round.imageUrl}
                    alt={round.answer}
                    loading="lazy"
                    class="h-6 w-6 rounded object-cover"
                    onerror={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                {/if}
                {round.answer} ({round.hints.length} hint{round.hints.length !== 1 ? 's' : ''})
              </li>
            {/each}
          </ol>
        </Card>
      {/if}
    {/if}

    <!-- Live Session -->
    {#if sessionId && game}
      <LiveSessionPanel
        {game}
        {sessionId}
        {appUrl}
        onStartGame={startGame}
        onNextRound={nextRound}
        onEndGame={endGame}
      />
    {:else}
      <Card padding="lg">
        <h2 class="mb-4 text-lg font-semibold text-text-primary">Live Session</h2>
        <Button onclick={createSession} disabled={game.status !== 'READY'}>
          Start Live Session
        </Button>
        {#if game.status !== 'READY'}
          <p class="mt-2 text-sm text-text-muted">Mark the game as Ready first.</p>
        {/if}
      </Card>
    {/if}
  {:else}
    <EmptyState title="Game not found" description="This game doesn't exist or has been deleted.">
      {#snippet action()}
        <Button href="/dashboard">Back to Dashboard</Button>
      {/snippet}
    </EmptyState>
  {/if}
</div>
