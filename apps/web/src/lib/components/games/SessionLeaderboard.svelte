<script lang="ts">
  import type { LeaderboardEntry, SessionUser } from '@twitch-hub/shared-types';

  let { entries, users }: { entries: LeaderboardEntry[]; users: SessionUser[] } = $props();

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

  function medalOrRank(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }
</script>

<div class="animate-fade-in rounded-xl border border-border-subtle bg-surface-elevated p-4">
  <div class="mb-3 flex items-center justify-between">
    <h3 class="text-sm font-semibold text-text-primary">Leaderboard</h3>
    <span class="text-xs text-text-muted">XP</span>
  </div>
  <ol class="space-y-2">
    {#each entries as entry (entry.playerId)}
      <li class="flex items-center gap-3">
        <span class="w-8 text-center text-sm font-bold {entry.rank <= 3 ? '' : 'text-text-muted'}">
          {medalOrRank(entry.rank)}
        </span>
        <span class="min-w-0 flex-1 truncate text-sm text-text-primary">
          {resolveDisplayName(entry.playerId)}
        </span>
        <span
          class="shrink-0 rounded-full bg-brand-600/20 px-2 py-0.5 text-xs font-semibold text-brand-400"
        >
          {entry.xp}
        </span>
      </li>
    {/each}
  </ol>
</div>
