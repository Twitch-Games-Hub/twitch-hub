<script lang="ts">
  import type { LeaderboardEntry, SessionUser } from '@twitch-hub/shared-types';
  import TweenedNumber from '$lib/components/ui/TweenedNumber.svelte';

  let { entries, users }: { entries: LeaderboardEntry[]; users: SessionUser[] } = $props();

  const top3 = $derived(entries.slice(0, 3));
  const rest = $derived(entries.slice(3));
  const hasPodium = $derived(top3.length >= 2);

  // Podium order: 2nd | 1st | 3rd
  const podiumOrder = $derived(
    top3.length >= 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [top3[1], top3[0]]
        : [top3[0]],
  );

  // Heights for podium columns (1st tallest)
  const podiumHeights: Record<number, string> = { 1: 'h-20', 2: 'h-14', 3: 'h-10' };

  function resolveDisplayName(playerId: string): string {
    const byUserId = users.find((u) => u.userId === playerId);
    if (byUserId?.displayName) return byUserId.displayName;
    if (playerId.startsWith('anon-')) {
      const socketId = playerId.slice(5);
      const bySocket = users.find((u) => u.socketId === socketId);
      if (bySocket?.displayName) return bySocket.displayName;
    }
    return 'Viewer';
  }

  function medal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    return '🥉';
  }

  function medalOrRank(rank: number): string {
    if (rank <= 3) return medal(rank);
    return `#${rank}`;
  }
</script>

<div class="animate-fade-in rounded-xl border border-border-subtle bg-surface-elevated p-4">
  <h3 class="mb-4 text-center text-sm font-semibold text-text-primary">Leaderboard</h3>

  {#if hasPodium}
    <!-- Podium (top 2-3) -->
    <div class="mb-5 flex items-end justify-center gap-2">
      {#each podiumOrder as entry (entry.playerId)}
        {@const h = podiumHeights[entry.rank] ?? 'h-10'}
        <div class="flex w-20 flex-col items-center gap-1">
          <span class="text-xl leading-none">{medal(entry.rank)}</span>
          <p class="w-full truncate text-center text-xs font-medium text-text-primary">
            {resolveDisplayName(entry.playerId)}
          </p>
          <p class="text-xs font-semibold text-brand-400"><TweenedNumber value={entry.xp} /> XP</p>
          <!-- Bar -->
          <div
            class="animate-podium-rise {h} w-full origin-bottom rounded-t-md {entry.rank === 1
              ? 'bg-brand-600/60'
              : 'bg-surface-tertiary'}"
          ></div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Full list (or flat list when no podium) -->
  {#if !hasPodium || rest.length > 0}
    <ol class="space-y-2 {hasPodium ? 'border-t border-border-subtle pt-3' : ''}">
      {#each hasPodium ? rest : entries as entry (entry.playerId)}
        <li class="flex items-center gap-3">
          <span
            class="w-8 text-center text-sm font-bold {entry.rank <= 3 ? '' : 'text-text-muted'}"
          >
            {medalOrRank(entry.rank)}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-text-primary">
            {resolveDisplayName(entry.playerId)}
          </span>
          <span
            class="shrink-0 rounded-full bg-brand-600/20 px-2 py-0.5 text-xs font-semibold text-brand-400"
          >
            <TweenedNumber value={entry.xp} />
          </span>
        </li>
      {/each}
    </ol>
  {/if}
</div>
