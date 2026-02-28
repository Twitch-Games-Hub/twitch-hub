<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { apiGet, apiPut } from '$lib/api';
  import { toastStore } from '$lib/stores/toast.svelte';
  import {
    GameStatus,
    type ApiGame,
    type GameType,
    type HotTakeConfig,
    type BalanceConfig,
    type BlindTestConfig,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { createGameSession } from '$lib/utils/session';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { EditIcon } from '$lib/components/ui/icons';

  let game = $state<ApiGame | null>(null);
  let loading = $state(true);
  let creatingSession = $state(false);
  let justPublished = $state(false);
  let publishConfirmOpen = $state(false);
  let unpublishConfirmOpen = $state(false);

  const gameId = $derived($page.params.gameId);

  const activeSession = $derived(
    game?.sessions?.find((s: { status: string }) => s.status === 'LOBBY' || s.status === 'LIVE'),
  );

  onMount(async () => {
    try {
      game = await apiGet<ApiGame>(`/api/games/${gameId}`);
    } catch {
      toastStore.add('Failed to load game', 'error');
    } finally {
      loading = false;
    }
  });

  async function createSession() {
    if (!gameId || creatingSession) return;
    creatingSession = true;

    try {
      const sessionId = await createGameSession(gameId);
      goto(`/dashboard/sessions/${sessionId}`);
    } catch {
      toastStore.add('Failed to create session', 'error');
    } finally {
      creatingSession = false;
    }
  }

  async function publishGame() {
    if (!game) return;
    try {
      await apiPut(`/api/games/${gameId}`, { ...game, status: GameStatus.READY });
      game = { ...game, status: GameStatus.READY };
      justPublished = true;
      toastStore.add('Your game is now live on the Explore page!', 'success');
    } catch {
      toastStore.add('Failed to publish game', 'error');
    }
  }

  async function unpublishGame() {
    if (!game) return;
    try {
      await apiPut(`/api/games/${gameId}`, { ...game, status: GameStatus.DRAFT });
      game = { ...game, status: GameStatus.DRAFT };
      justPublished = false;
      toastStore.add('Game unpublished and reverted to draft', 'info');
    } catch {
      toastStore.add('Failed to unpublish game', 'error');
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
          <StatusBadge status={game!.status} />
          <Button href="/dashboard/games/{gameId}/edit" variant="secondary" size="sm">
            <EditIcon size={16} />
            Edit
          </Button>
          {#if game!.status === GameStatus.DRAFT}
            <Button onclick={() => (publishConfirmOpen = true)} variant="primary"
              >Publish to Gallery</Button
            >
          {:else if game!.status === GameStatus.READY}
            <Button onclick={() => (unpublishConfirmOpen = true)} variant="ghost" size="sm"
              >Unpublish</Button
            >
          {/if}
        </div>
      {/snippet}
    </PageHeader>

    <!-- Cover image + description -->
    {#if game.coverImageUrl}
      <div class="mb-4 overflow-hidden rounded-xl">
        <img
          src={game.coverImageUrl}
          alt="{game.title} cover"
          loading="lazy"
          class="h-48 w-full object-cover"
          onerror={(e) => {
            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
          }}
        />
      </div>
    {/if}
    {#if game.description}
      <p class="mb-6 text-text-secondary">{game.description}</p>
    {/if}

    <!-- Post-publish success banner -->
    {#if justPublished}
      <Card padding="md" class="mb-6 border-success-500/30 bg-success-900/20">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-success-500">Your game is live!</h3>
            <p class="text-sm text-text-secondary">
              It's now visible to all streamers on the Explore page.
            </p>
          </div>
          <Button href="/explore" variant="secondary" size="sm">View on Explore</Button>
        </div>
      </Card>
    {/if}

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
    <Card padding="lg">
      <h2 class="mb-4 text-lg font-semibold text-text-primary">Live Session</h2>
      {#if activeSession}
        <Button href="/dashboard/sessions/{activeSession.id}">Resume Session</Button>
      {:else if game.status === GameStatus.READY}
        <Button onclick={createSession} disabled={creatingSession}>
          {creatingSession ? 'Creating...' : 'Start Live Session'}
        </Button>
      {:else}
        <Button disabled>Start Live Session</Button>
        <p class="mt-2 text-sm text-text-muted">Publish the game first to start a live session.</p>
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

<!-- Publish confirmation dialog -->
<ConfirmDialog
  bind:open={publishConfirmOpen}
  title="Publish to Gallery"
  confirmLabel="Publish"
  confirmVariant="primary"
  onconfirm={publishGame}
>
  <p class="mb-3 text-text-secondary">
    Publishing makes this game visible to all streamers on the Explore page.
  </p>
  <ul class="list-inside list-disc space-y-1 text-sm text-text-secondary">
    <li>Anyone can browse and use this game on their stream</li>
    <li>Other streamers can rate it</li>
    <li>You can unpublish it at any time</li>
  </ul>
</ConfirmDialog>

<!-- Unpublish confirmation dialog -->
<ConfirmDialog
  bind:open={unpublishConfirmOpen}
  title="Unpublish Game"
  message="This will remove your game from the Explore gallery. It will revert to a draft. You can re-publish it later."
  confirmLabel="Unpublish"
  onconfirm={unpublishGame}
/>
