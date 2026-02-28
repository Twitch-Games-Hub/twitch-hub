<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiDelete } from '$lib/api';
  import type { ApiGame } from '@twitch-hub/shared-types';

  let games = $state<ApiGame[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      games = await apiGet<ApiGame[]>('/api/games');
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      loading = false;
    }
  });

  async function deleteGame(id: string) {
    if (!confirm('Delete this game?')) return;
    await apiDelete(`/api/games/${id}`);
    games = games.filter(g => g.id !== id);
  }

  const gameTypeLabels: Record<string, string> = {
    HOT_TAKE: 'Hot Take Meter',
    BRACKET: 'World Cup Bracket',
    BALANCE: 'Balance Game',
    PERSONALITY: 'Personality Quiz',
    TIER_LIST: 'Tier List',
    BLIND_TEST: 'Blind Test',
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-900 text-yellow-300',
    READY: 'bg-green-900 text-green-300',
    ARCHIVED: 'bg-gray-700 text-gray-400',
  };
</script>

<svelte:head>
  <title>Dashboard - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <div class="mb-8 flex items-center justify-between">
    <h1 class="text-3xl font-bold">Your Games</h1>
    <a
      href="/dashboard/games/new"
      class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
    >
      + New Game
    </a>
  </div>

  {#if loading}
    <p class="text-gray-400">Loading...</p>
  {:else if games.length === 0}
    <div class="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
      <h2 class="mb-2 text-xl font-semibold text-gray-300">No games yet</h2>
      <p class="mb-6 text-gray-500">Create your first interactive game for your stream.</p>
      <a
        href="/dashboard/games/new"
        class="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700"
      >
        Create Game
      </a>
    </div>
  {:else}
    <div class="grid gap-4">
      {#each games as game}
        <div class="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div>
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold">{game.title}</h3>
              <span class="rounded px-2 py-0.5 text-xs font-medium {statusColors[game.status]}">{game.status}</span>
            </div>
            <p class="text-sm text-gray-400">{gameTypeLabels[game.type] || game.type}</p>
          </div>
          <div class="flex items-center gap-2">
            <a
              href="/dashboard/games/{game.id}"
              class="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
            >
              Manage
            </a>
            <button
              onclick={() => deleteGame(game.id)}
              class="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900"
            >
              Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
