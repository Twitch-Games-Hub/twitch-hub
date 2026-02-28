<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGet, apiDelete } from '$lib/api';
  import { GameStatus, type ApiGame, type GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { createGameSession } from '$lib/utils/session';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { PlusIcon, TrashIcon, GamepadIcon, EditIcon } from '$lib/components/ui/icons';

  let games = $state<ApiGame[]>([]);
  let loading = $state(true);
  let deleteTarget = $state<string | null>(null);
  let confirmOpen = $state(false);
  let creatingGameId = $state<string | null>(null);

  onMount(async () => {
    try {
      games = await apiGet<ApiGame[]>('/api/games');
    } catch {
      toastStore.add('Failed to load games', 'error');
    } finally {
      loading = false;
    }
  });

  function promptDelete(id: string) {
    deleteTarget = id;
    confirmOpen = true;
  }

  async function startSession(gameId: string) {
    if (creatingGameId) return;
    creatingGameId = gameId;
    try {
      const sessionId = await createGameSession(gameId);
      goto(`/dashboard/sessions/${sessionId}`);
    } catch {
      toastStore.add('Failed to create session', 'error');
    } finally {
      creatingGameId = null;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/games/${deleteTarget}`);
      games = games.filter((g) => g.id !== deleteTarget);
      toastStore.add('Game deleted', 'success');
    } catch {
      toastStore.add('Failed to delete game', 'error');
    }
  }
</script>

<svelte:head>
  <title>Dashboard - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <PageHeader title="Your Games">
    {#snippet action()}
      <Button href="/dashboard/games/new">
        <PlusIcon size={16} />
        New Game
      </Button>
    {/snippet}
  </PageHeader>

  {#if loading}
    <div class="space-y-4">
      {#each [1, 2, 3] as n (n)}
        <Skeleton height="5rem" rounded="rounded-xl" />
      {/each}
    </div>
  {:else if games.length === 0}
    <EmptyState
      title="No games yet"
      description="Create your first interactive game for your stream."
    >
      {#snippet action()}
        <Button href="/dashboard/games/new">
          <PlusIcon size={16} />
          Create Game
        </Button>
      {/snippet}
    </EmptyState>
  {:else}
    <Card padding="none" class="divide-y divide-border-default overflow-hidden">
      {#each games as game (game.id)}
        <div
          class="animate-fade-in flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-surface-tertiary/60 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="truncate text-sm font-medium text-text-primary">{game.title}</h3>
              <StatusBadge status={game.status} />
            </div>
            <p class="mt-0.5 text-xs text-text-muted">
              {GAME_TYPE_META[game.type as GameType]?.label ||
                game.type}{#if game.status === GameStatus.READY}
                <span class="text-text-muted"> · Visible on Explore</span>
              {:else if game.status === GameStatus.ARCHIVED}
                <span class="text-text-muted"> · Hidden</span>
              {/if}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <Button
              onclick={() => startSession(game.id)}
              variant="primary"
              size="sm"
              loading={creatingGameId === game.id}
              disabled={creatingGameId !== null}
            >
              <GamepadIcon size={14} />
              Start
            </Button>
            <Button href="/dashboard/games/{game.id}" variant="ghost" size="sm" class="!px-2">
              <EditIcon size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="!px-2 hover:!bg-danger-900/20 hover:!text-danger-500"
              onclick={() => promptDelete(game.id)}
            >
              <TrashIcon size={14} />
            </Button>
          </div>
        </div>
      {/each}
    </Card>
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete Game"
  message="Are you sure you want to delete this game? This action cannot be undone."
  confirmLabel="Delete"
  onconfirm={confirmDelete}
/>
