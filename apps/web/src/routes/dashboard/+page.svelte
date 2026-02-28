<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiDelete } from '$lib/api';
  import type { ApiGame, GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { toastStore } from '$lib/stores/toast.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { PlusIcon, TrashIcon } from '$lib/components/ui/icons';

  let games = $state<ApiGame[]>([]);
  let loading = $state(true);
  let deleteTarget = $state<string | null>(null);
  let confirmOpen = $state(false);

  onMount(async () => {
    try {
      games = await apiGet<ApiGame[]>('/api/games');
    } catch (err) {
      toastStore.add('Failed to load games', 'error');
    } finally {
      loading = false;
    }
  });

  function promptDelete(id: string) {
    deleteTarget = id;
    confirmOpen = true;
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
      {#each [1, 2, 3] as _}
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
    <div class="grid gap-4">
      {#each games as game}
        <Card
          padding="md"
          class="animate-fade-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h3 class="text-lg font-semibold text-text-primary">{game.title}</h3>
              <StatusBadge status={game.status} />
            </div>
            <p class="text-sm text-text-secondary">
              {GAME_TYPE_META[game.type as GameType]?.label || game.type}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button href="/dashboard/games/{game.id}" variant="secondary" size="sm">Manage</Button>
            <Button variant="danger" size="sm" onclick={() => promptDelete(game.id)}>
              <TrashIcon size={14} />
              Delete
            </Button>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete Game"
  message="Are you sure you want to delete this game? This action cannot be undone."
  confirmLabel="Delete"
  onconfirm={confirmDelete}
/>
