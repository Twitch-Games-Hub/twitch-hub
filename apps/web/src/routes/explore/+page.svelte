<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { GameType, type ApiPublicGame, type RateGameResponse } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { authStore } from '$lib/stores/auth.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { createGameSession } from '$lib/utils/session';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ExploreGameCard from '$lib/components/explore/ExploreGameCard.svelte';

  let games = $state<ApiPublicGame[]>([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let page = $state(1);
  let total = $state(0);
  let activeType = $state<string>('');
  let sort = $state<'rating' | 'newest'>('rating');
  let creatingGameId = $state<string | null>(null);

  const limit = 20;
  const hasMore = $derived(page * limit < total);
  const allTypes = Object.values(GameType);

  async function fetchGames(reset = false) {
    if (reset) {
      page = 1;
      loading = true;
    } else {
      loadingMore = true;
    }

    try {
      const params = new SvelteURLSearchParams([
        ['page', String(page)],
        ['limit', String(limit)],
        ['sort', sort],
      ]);
      if (activeType) params.set('type', activeType);

      const res = await fetch(`/api/explore?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      if (reset) {
        games = data.games;
      } else {
        games = [...games, ...data.games];
      }
      total = data.total;
    } catch {
      toastStore.add('Failed to load games', 'error');
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  function filterByType(type: string) {
    activeType = type;
    fetchGames(true);
  }

  function changeSort(newSort: 'rating' | 'newest') {
    sort = newSort;
    fetchGames(true);
  }

  function loadMore() {
    page += 1;
    fetchGames(false);
  }

  async function rateGame(game: ApiPublicGame, value: 1 | -1) {
    if (!authStore.user) {
      toastStore.add('Log in to rate games', 'info');
      return;
    }

    const prevRating = game.userRating;
    const prevScore = game.ratingScore;
    const prevCount = game.ratingCount;

    try {
      let data: RateGameResponse;

      if (game.userRating === value) {
        // Toggle off
        const res = await fetch(`/api/explore/${game.id}/rate`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        data = await res.json();
      } else {
        // Set or switch
        const res = await fetch(`/api/explore/${game.id}/rate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        if (!res.ok) throw new Error();
        data = await res.json();
      }

      game.ratingScore = data.ratingScore;
      game.ratingCount = data.ratingCount;
      game.userRating = data.userRating;
    } catch {
      game.ratingScore = prevScore;
      game.ratingCount = prevCount;
      game.userRating = prevRating;
      toastStore.add('Failed to rate game', 'error');
    }
  }

  async function toggleSave(game: ApiPublicGame) {
    if (!authStore.user) {
      toastStore.add('Log in to save games', 'info');
      return;
    }

    const wasSaved = game.isSaved;

    try {
      const res = await fetch(`/api/explore/${game.id}/save`, {
        method: wasSaved ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      game.isSaved = data.isSaved;
    } catch {
      game.isSaved = wasSaved;
      toastStore.add('Failed to update bookmark', 'error');
    }
  }

  async function startSession(gameId: string) {
    if (creatingGameId) return;
    creatingGameId = gameId;
    try {
      const sessionId = await createGameSession(gameId);
      goto(resolve(`/dashboard/sessions/${sessionId}?source=explore`));
    } catch {
      toastStore.add('Failed to create session', 'error');
    } finally {
      creatingGameId = null;
    }
  }

  onMount(() => {
    fetchGames(true);
  });
</script>

<svelte:head>
  <title>Explore Games - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <PageHeader title="Explore Games" subtitle="Browse community games and use them on your stream" />

  <!-- Filters -->
  <div class="mb-6 flex flex-wrap items-center gap-3">
    <div class="flex flex-wrap gap-2">
      <button
        class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {activeType === ''
          ? 'bg-brand-600 text-white'
          : 'bg-surface-elevated text-text-secondary hover:text-text-primary'}"
        onclick={() => filterByType('')}
      >
        All
      </button>
      {#each allTypes as type (type)}
        <button
          class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {activeType === type
            ? 'bg-brand-600 text-white'
            : 'bg-surface-elevated text-text-secondary hover:text-text-primary'}"
          onclick={() => filterByType(type)}
        >
          {GAME_TYPE_META[type].label}
        </button>
      {/each}
    </div>

    <div class="ml-auto flex gap-2">
      <button
        class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {sort === 'rating'
          ? 'bg-surface-elevated text-text-primary'
          : 'text-text-muted hover:text-text-secondary'}"
        onclick={() => changeSort('rating')}
      >
        Top Rated
      </button>
      <button
        class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {sort === 'newest'
          ? 'bg-surface-elevated text-text-primary'
          : 'text-text-muted hover:text-text-secondary'}"
        onclick={() => changeSort('newest')}
      >
        Newest
      </button>
    </div>
  </div>

  <!-- Game Grid -->
  {#if loading}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each Array(4) as _, i (i)}
        <Skeleton height="12rem" rounded="rounded-xl" />
      {/each}
    </div>
  {:else if games.length === 0}
    <EmptyState
      title="No games yet"
      description="No public games have been created yet. Be the first!"
    >
      {#snippet action()}
        <Button href="/auth/login">Get Started</Button>
      {/snippet}
    </EmptyState>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each games as game (game.id)}
        <ExploreGameCard
          {game}
          onrate={rateGame}
          onsave={toggleSave}
          onstart={startSession}
          {creatingGameId}
        />
      {/each}
    </div>

    {#if hasMore}
      <div class="mt-8 text-center">
        <Button onclick={loadMore} loading={loadingMore} variant="secondary">Load More</Button>
      </div>
    {/if}
  {/if}
</div>
