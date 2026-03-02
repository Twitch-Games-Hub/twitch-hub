<script lang="ts">
  import { onMount } from 'svelte';
  import RankBadge from '$lib/components/gamification/RankBadge.svelte';
  import type { RankTier } from '@twitch-hub/shared-types';

  interface LeaderboardEntry {
    rank: number;
    twitchLogin: string | null;
    displayName: string;
    profileImageUrl: string | null;
    totalXp: number;
    level: number;
    rankTier: RankTier;
  }

  const LIMIT = 50;

  let entries = $state<LeaderboardEntry[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let currentPage = $state(1);

  let totalPages = $derived(Math.max(1, Math.ceil(total / LIMIT)));

  async function fetchLeaderboard(page: number) {
    loading = true;
    try {
      const offset = (page - 1) * LIMIT;
      const res = await fetch(`/api/gamification/leaderboard?limit=${LIMIT}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        entries = data.entries;
        total = data.total;
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      loading = false;
    }
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchLeaderboard(page);
  }

  onMount(() => {
    fetchLeaderboard(1);
  });

  function rowHighlight(rank: number): string {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-300/10 border-gray-400/30';
    if (rank === 3) return 'bg-amber-700/10 border-amber-600/30';
    return 'border-border-default';
  }

  function rankLabel(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }
</script>

<svelte:head>
  <title>Leaderboard - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold text-text-primary">Global Leaderboard</h1>

  {#if loading}
    <div class="space-y-3 animate-pulse">
      {#each Array(10) as _, i (i)}
        <div
          class="flex items-center gap-4 rounded-lg border border-border-default bg-surface-secondary px-4 py-3"
        >
          <div class="h-5 w-8 rounded bg-surface-elevated"></div>
          <div class="h-8 w-8 rounded-full bg-surface-elevated"></div>
          <div class="h-5 w-32 rounded bg-surface-elevated"></div>
          <div class="ml-auto h-5 w-16 rounded bg-surface-elevated"></div>
        </div>
      {/each}
    </div>
  {:else if entries.length === 0}
    <div class="py-20 text-center">
      <p class="text-lg text-text-muted">No players yet. Be the first!</p>
    </div>
  {:else}
    <!-- Table header -->
    <div
      class="mb-2 hidden items-center gap-4 px-4 text-xs font-semibold uppercase text-text-muted sm:flex"
    >
      <span class="w-12 text-center">Rank</span>
      <span class="flex-1">Player</span>
      <span class="w-24 text-center">Rank Tier</span>
      <span class="w-16 text-center">Level</span>
      <span class="w-24 text-right">Total XP</span>
    </div>

    <!-- Entries -->
    <div class="space-y-2">
      {#each entries as entry (entry.rank)}
        <a
          href="/u/{entry.twitchLogin}"
          class="flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-surface-tertiary {rowHighlight(
            entry.rank,
          )}"
        >
          <!-- Rank -->
          <span class="w-12 text-center text-sm font-bold text-text-primary">
            {rankLabel(entry.rank)}
          </span>

          <!-- Player -->
          <div class="flex flex-1 items-center gap-3 min-w-0">
            {#if entry.profileImageUrl}
              <img
                src={entry.profileImageUrl}
                alt={entry.displayName}
                class="h-8 w-8 shrink-0 rounded-full"
              />
            {:else}
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-400"
              >
                {entry.displayName.charAt(0).toUpperCase()}
              </div>
            {/if}
            <span class="truncate text-sm font-medium text-text-primary">
              {entry.displayName}
            </span>
          </div>

          <!-- Rank Tier -->
          <div class="hidden w-24 justify-center sm:flex">
            <RankBadge tier={entry.rankTier} size="sm" />
          </div>

          <!-- Level -->
          <span class="hidden w-16 text-center text-sm text-text-secondary sm:block">
            {entry.level}
          </span>

          <!-- Total XP -->
          <span class="w-24 text-right text-sm font-semibold text-text-primary">
            {entry.totalXp.toLocaleString()} XP
          </span>
        </a>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="mt-6 flex items-center justify-center gap-4">
        <button
          class="rounded-lg border border-border-default bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage <= 1}
          onclick={() => goToPage(currentPage - 1)}
        >
          Previous
        </button>
        <span class="text-sm text-text-muted">
          Page {currentPage} of {totalPages}
        </span>
        <button
          class="rounded-lg border border-border-default bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onclick={() => goToPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>
