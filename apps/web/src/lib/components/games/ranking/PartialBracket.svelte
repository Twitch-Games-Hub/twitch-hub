<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import type { CompletedMatchup } from '$lib/stores/game.svelte';

  let {
    matchups,
    bracketSize,
    currentMatchupMeta,
  }: {
    matchups: CompletedMatchup[];
    bracketSize: number;
    currentMatchupMeta?: { bracketLevel: number; matchupIndex: number; levelName?: string } | null;
  } = $props();

  function getLevelName(level: number): string {
    const remaining = bracketSize / Math.pow(2, level);
    if (remaining === 1) return 'Final';
    if (remaining === 2) return 'Semifinals';
    if (remaining === 4) return 'Quarterfinals';
    return `Round of ${remaining * 2}`;
  }

  interface LevelGroup {
    level: number;
    name: string;
    matchups: CompletedMatchup[];
  }

  const levels = $derived.by(() => {
    const map = new SvelteMap<number, CompletedMatchup[]>();
    for (const m of matchups) {
      const arr = map.get(m.bracketLevel) ?? [];
      arr.push(m);
      map.set(m.bracketLevel, arr);
    }
    const groups: LevelGroup[] = [];
    for (const [level, ms] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
      groups.push({ level, name: getLevelName(level), matchups: ms });
    }
    return groups;
  });

  const showCurrentLevel = $derived(
    currentMatchupMeta &&
      !matchups.some(
        (m) =>
          m.bracketLevel === currentMatchupMeta!.bracketLevel &&
          m.matchupIndex === currentMatchupMeta!.matchupIndex,
      ),
  );
</script>

<div class="space-y-4 text-left">
  {#each levels as group (group.level)}
    <div>
      <p class="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
        {group.name}
      </p>
      <div class="space-y-2">
        {#each group.matchups as matchup (matchup.matchupIndex)}
          <div class="rounded-lg border border-border-default bg-surface-secondary p-3 text-sm">
            <div
              class="flex items-center justify-between gap-2 {matchup.winnerName ===
              matchup.itemA.name
                ? 'font-semibold text-brand-400'
                : 'text-text-secondary'}"
            >
              <div class="flex min-w-0 items-center gap-1.5">
                {#if matchup.itemA.imageUrl}
                  <img
                    src={matchup.itemA.imageUrl}
                    alt={matchup.itemA.name}
                    class="h-5 w-5 shrink-0 rounded object-cover"
                  />
                {/if}
                <span class="truncate">{matchup.itemA.name}</span>
              </div>
              <span class="shrink-0 tabular-nums">{matchup.voteCountA}</span>
            </div>
            <div class="my-1.5 border-t border-border-subtle"></div>
            <div
              class="flex items-center justify-between gap-2 {matchup.winnerName ===
              matchup.itemB.name
                ? 'font-semibold text-brand-400'
                : 'text-text-secondary'}"
            >
              <div class="flex min-w-0 items-center gap-1.5">
                {#if matchup.itemB.imageUrl}
                  <img
                    src={matchup.itemB.imageUrl}
                    alt={matchup.itemB.name}
                    class="h-5 w-5 shrink-0 rounded object-cover"
                  />
                {/if}
                <span class="truncate">{matchup.itemB.name}</span>
              </div>
              <span class="shrink-0 tabular-nums">{matchup.voteCountB}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if showCurrentLevel}
    <div>
      <p class="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
        {currentMatchupMeta?.levelName ?? getLevelName(currentMatchupMeta!.bracketLevel)}
      </p>
      <div
        class="flex animate-pulse items-center justify-center rounded-lg border border-border-default bg-surface-secondary p-3 text-sm text-text-muted"
      >
        Voting in progress...
      </div>
    </div>
  {/if}
</div>
