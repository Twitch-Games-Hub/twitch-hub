<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { apiGet, apiPut } from '$lib/api';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { type GameType, type ApiGame } from '@twitch-hub/shared-types';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import GameWizard from '$lib/components/editor/GameWizard.svelte';

  const gameId = $derived($page.params.gameId);

  let game = $state<ApiGame | null>(null);
  let loading = $state(true);
  let saving = $state(false);

  onMount(async () => {
    try {
      game = await apiGet<ApiGame>(`/api/games/${gameId}`);
    } catch {
      toastStore.add('Failed to load game', 'error');
    } finally {
      loading = false;
    }
  });

  async function handleSubmit(data: {
    type: GameType;
    title: string;
    description?: string;
    coverImageUrl?: string;
    config: unknown;
  }) {
    saving = true;
    try {
      const { type: _, ...payload } = data;
      await apiPut(`/api/games/${gameId}`, payload);
      toastStore.add('Game updated successfully', 'success');
      goto(`/dashboard/games/${gameId}`);
    } catch (err) {
      toastStore.add(err instanceof Error ? err.message : 'Failed to save changes', 'error');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit {game?.title || 'Game'} - Dashboard</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
  {#if loading}
    <div class="space-y-6">
      <Skeleton width="300px" height="2.5rem" />
      <Skeleton height="1rem" width="150px" />
      <Skeleton height="16rem" rounded="rounded-xl" />
    </div>
  {:else if game}
    <PageHeader title="Edit Game" back="/dashboard/games/{gameId}" />

    <Card padding="lg">
      <GameWizard
        mode="edit"
        gameType={game.type as GameType}
        initialTitle={game.title}
        initialDescription={game.description ?? ''}
        initialCoverImageUrl={game.coverImageUrl ?? ''}
        initialConfig={game.config}
        submitting={saving}
        onsubmit={handleSubmit}
        cancelHref="/dashboard/games/{gameId}"
      />
    </Card>
  {/if}
</div>
