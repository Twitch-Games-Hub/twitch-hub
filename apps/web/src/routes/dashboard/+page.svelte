<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGet, apiDelete } from '$lib/api';
  import {
    GameStatus,
    type ApiGame,
    type ApiPublicGame,
    type GameType,
    type RateGameResponse,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { authStore } from '$lib/stores/auth.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { createGameSession } from '$lib/utils/session';
  import { UsersIcon } from '$lib/components/ui/icons';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import ExploreGameCard from '$lib/components/explore/ExploreGameCard.svelte';
  import { PlusIcon, TrashIcon, GamepadIcon, EditIcon } from '$lib/components/ui/icons';
  import SessionBudgetIndicator from '$lib/components/ui/SessionBudgetIndicator.svelte';
  import UpgradePrompt from '$lib/components/ui/UpgradePrompt.svelte';
  import { subscriptionStore } from '$lib/stores/subscription.svelte';

  let games = $state<ApiGame[]>([]);
  let loading = $state(true);
  let deleteTarget = $state<string | null>(null);
  let confirmOpen = $state(false);
  let creatingGameId = $state<string | null>(null);

  // Tab state
  let activeTab = $state<'my-games' | 'saved' | 'mod-for'>('my-games');

  // Saved games state
  let savedGames = $state<ApiPublicGame[]>([]);
  let savedLoading = $state(false);
  let savedLoaded = $state(false);

  // Mod For state
  interface ModStreamer {
    streamerId: string;
    displayName: string;
    profileImageUrl: string | null;
    twitchLogin: string;
    games?: Array<{
      id: string;
      type: string;
      title: string;
      description: string | null;
      coverImageUrl: string | null;
      status: string;
      createdAt: string;
    }>;
    gamesLoading?: boolean;
  }
  let modStreamers = $state<ModStreamer[]>([]);
  let modLoading = $state(false);
  let modLoaded = $state(false);

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
    } catch (err) {
      toastStore.add(err instanceof Error ? err.message : 'Failed to create session', 'error');
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

  // Saved tab functions
  async function fetchSavedGames() {
    if (savedLoaded) return;
    savedLoading = true;
    try {
      const res = await fetch('/api/bookmarks?limit=50');
      if (!res.ok) throw new Error();
      const data = await res.json();
      savedGames = data.games;
      savedLoaded = true;
    } catch {
      toastStore.add('Failed to load saved games', 'error');
    } finally {
      savedLoading = false;
    }
  }

  function switchTab(tab: 'my-games' | 'saved' | 'mod-for') {
    activeTab = tab;
    if (tab === 'saved') fetchSavedGames();
    if (tab === 'mod-for') fetchModStreamers();
  }

  async function fetchModStreamers() {
    if (modLoaded) return;
    modLoading = true;
    try {
      const data = await apiGet<{ streamers: ModStreamer[] }>('/api/moderators/streamers');
      modStreamers = data.streamers;
      modLoaded = true;
      // Auto-load games for each streamer
      for (const streamer of modStreamers) {
        loadStreamerGames(streamer);
      }
    } catch {
      toastStore.add('Failed to load streamers', 'error');
    } finally {
      modLoading = false;
    }
  }

  async function loadStreamerGames(streamer: ModStreamer) {
    streamer.gamesLoading = true;
    try {
      const data = await apiGet<{ games: ModStreamer['games'] }>(
        `/api/moderators/streamers/${streamer.streamerId}/games`,
      );
      streamer.games = data.games ?? [];
    } catch {
      streamer.games = [];
    } finally {
      streamer.gamesLoading = false;
    }
  }

  async function startModSession(gameId: string, streamerId: string) {
    if (creatingGameId) return;
    creatingGameId = gameId;
    try {
      const sessionId = await createGameSession(gameId, streamerId);
      goto(`/dashboard/sessions/${sessionId}`);
    } catch (err) {
      toastStore.add(err instanceof Error ? err.message : 'Failed to create session', 'error');
    } finally {
      creatingGameId = null;
    }
  }

  async function unsaveGame(game: ApiPublicGame) {
    try {
      const res = await fetch(`/api/explore/${game.id}/save`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      savedGames = savedGames.filter((g) => g.id !== game.id);
    } catch {
      toastStore.add('Failed to unsave game', 'error');
    }
  }

  async function rateSavedGame(game: ApiPublicGame, value: 1 | -1) {
    const prevRating = game.userRating;
    const prevScore = game.ratingScore;
    const prevCount = game.ratingCount;

    try {
      let data: RateGameResponse;

      if (game.userRating === value) {
        const res = await fetch(`/api/explore/${game.id}/rate`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        data = await res.json();
      } else {
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
</script>

<svelte:head>
  <title>Dashboard - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <PageHeader title="Your Games">
    {#snippet action()}
      <div class="flex items-center gap-3">
        <SessionBudgetIndicator />
        <Button href="/dashboard/games/new">
          <PlusIcon size={16} />
          New Game
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  {#if subscriptionStore.loaded && !subscriptionStore.canCreateSession}
    <div class="mb-6">
      <UpgradePrompt />
    </div>
  {/if}

  <!-- Tabs -->
  <div class="mb-6 flex border-b border-border-default">
    <button
      class="relative px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'my-games'
        ? 'text-brand-400'
        : 'text-text-muted hover:text-text-secondary'}"
      onclick={() => switchTab('my-games')}
    >
      My Games
      {#if activeTab === 'my-games'}
        <span class="absolute inset-x-0 bottom-0 h-0.5 bg-brand-400"></span>
      {/if}
    </button>
    <button
      class="relative px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'saved'
        ? 'text-brand-400'
        : 'text-text-muted hover:text-text-secondary'}"
      onclick={() => switchTab('saved')}
    >
      Saved Games
      {#if activeTab === 'saved'}
        <span class="absolute inset-x-0 bottom-0 h-0.5 bg-brand-400"></span>
      {/if}
    </button>
    <button
      class="relative px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'mod-for'
        ? 'text-brand-400'
        : 'text-text-muted hover:text-text-secondary'}"
      onclick={() => switchTab('mod-for')}
    >
      <span class="flex items-center gap-1.5">
        <UsersIcon size={14} />
        Mod For
      </span>
      {#if activeTab === 'mod-for'}
        <span class="absolute inset-x-0 bottom-0 h-0.5 bg-brand-400"></span>
      {/if}
    </button>
  </div>

  <!-- My Games Tab -->
  {#if activeTab === 'my-games'}
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
                disabled={creatingGameId !== null || !subscriptionStore.canCreateSession}
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

    <!-- Saved Games Tab -->
  {:else if activeTab === 'saved'}
    {#if savedLoading}
      <div class="grid gap-4 sm:grid-cols-2">
        {#each Array(4) as _, i (i)}
          <Skeleton height="12rem" rounded="rounded-xl" />
        {/each}
      </div>
    {:else if savedGames.length === 0}
      <EmptyState
        title="No saved games"
        description="Browse the Explore page and bookmark games you'd like to use later."
      >
        {#snippet action()}
          <Button href="/explore" variant="secondary">Explore Games</Button>
        {/snippet}
      </EmptyState>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2">
        {#each savedGames as game (game.id)}
          <ExploreGameCard
            {game}
            onrate={rateSavedGame}
            onsave={unsaveGame}
            onstart={startSession}
            {creatingGameId}
          />
        {/each}
      </div>
    {/if}

    <!-- Mod For Tab -->
  {:else if activeTab === 'mod-for'}
    {#if modLoading}
      <div class="space-y-4">
        {#each [1, 2] as n (n)}
          <Skeleton height="8rem" rounded="rounded-xl" />
        {/each}
      </div>
    {:else if modStreamers.length === 0}
      <EmptyState
        title="Not moderating for anyone"
        description="When a streamer enables you as a moderator in their settings, their games will appear here."
      />
    {:else}
      <div class="space-y-6">
        {#each modStreamers as streamer (streamer.streamerId)}
          <Card>
            <div class="mb-3 flex items-center gap-3">
              {#if streamer.profileImageUrl}
                <img src={streamer.profileImageUrl} alt="" class="h-8 w-8 rounded-full" />
              {:else}
                <div class="h-8 w-8 rounded-full bg-surface-tertiary"></div>
              {/if}
              <div>
                <h3 class="text-sm font-semibold text-text-primary">{streamer.displayName}</h3>
                <p class="text-xs text-text-muted">@{streamer.twitchLogin}</p>
              </div>
            </div>

            {#if streamer.gamesLoading}
              <Skeleton height="3rem" rounded="rounded-lg" />
            {:else if !streamer.games || streamer.games.length === 0}
              <p class="text-sm text-text-muted">No ready games available.</p>
            {:else}
              <div class="divide-y divide-border-subtle">
                {#each streamer.games as game (game.id)}
                  <div class="flex items-center justify-between py-2">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-text-primary">{game.title}</p>
                      <p class="text-xs text-text-muted">
                        {GAME_TYPE_META[game.type as GameType]?.label || game.type}
                      </p>
                    </div>
                    <Button
                      onclick={() => startModSession(game.id, streamer.streamerId)}
                      variant="primary"
                      size="sm"
                      loading={creatingGameId === game.id}
                      disabled={creatingGameId !== null}
                    >
                      <GamepadIcon size={14} />
                      Start Session
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete Game"
  message="Are you sure you want to delete this game? This action cannot be undone."
  confirmLabel="Delete"
  onconfirm={confirmDelete}
/>
