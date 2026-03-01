<script lang="ts">
  import type { BracketMatchupResult } from '@twitch-hub/shared-types';

  let {
    matchups,
    bracketSize,
    champion,
  }: {
    matchups: BracketMatchupResult[];
    bracketSize: number;
    champion: { id: string; name: string; imageUrl?: string };
  } = $props();

  const totalLevels = $derived(Math.log2(bracketSize));

  function getMatchupsAtLevel(level: number): BracketMatchupResult[] {
    return matchups.filter((m) => m.bracketLevel === level);
  }

  function getLevelName(level: number): string {
    const remaining = bracketSize / Math.pow(2, level);
    if (remaining === 1) return 'Final';
    if (remaining === 2) return 'Semifinals';
    if (remaining === 4) return 'Quarterfinals';
    return `Round of ${remaining * 2}`;
  }
</script>

<div class="bracket-viz overflow-x-auto">
  <div class="flex gap-6 min-w-max items-center">
    {#each Array(totalLevels) as _, level (level)}
      <div class="flex flex-col gap-4">
        <h4 class="text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
          {getLevelName(level)}
        </h4>
        {#each getMatchupsAtLevel(level) as matchup (matchup.matchupIndex)}
          <div
            class="rounded-lg border border-border-default bg-surface-secondary p-3 text-sm min-w-[180px]"
          >
            <div
              class="flex items-center justify-between gap-2 {matchup.winnerId === matchup.itemA.id
                ? 'font-semibold text-brand-400'
                : 'text-text-secondary'}"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                {#if matchup.itemA.imageUrl}
                  <img
                    src={matchup.itemA.imageUrl}
                    alt={matchup.itemA.name}
                    class="h-5 w-5 rounded object-cover shrink-0"
                  />
                {/if}
                <span class="truncate">{matchup.itemA.name}</span>
              </div>
              <span class="tabular-nums shrink-0">{matchup.voteCountA}</span>
            </div>
            <div class="my-1.5 border-t border-border-subtle"></div>
            <div
              class="flex items-center justify-between gap-2 {matchup.winnerId === matchup.itemB.id
                ? 'font-semibold text-brand-400'
                : 'text-text-secondary'}"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                {#if matchup.itemB.imageUrl}
                  <img
                    src={matchup.itemB.imageUrl}
                    alt={matchup.itemB.name}
                    class="h-5 w-5 rounded object-cover shrink-0"
                  />
                {/if}
                <span class="truncate">{matchup.itemB.name}</span>
              </div>
              <span class="tabular-nums shrink-0">{matchup.voteCountB}</span>
            </div>
          </div>
        {/each}
      </div>
    {/each}

    <!-- Champion -->
    <div class="flex flex-col gap-4">
      <h4 class="text-center text-xs font-semibold text-brand-400 uppercase tracking-wider">
        Champion
      </h4>
      <div
        class="rounded-lg border-2 border-brand-400 bg-brand-600/10 p-4 text-center min-w-[140px]"
      >
        {#if champion.imageUrl}
          <img
            src={champion.imageUrl}
            alt={champion.name}
            class="mx-auto mb-2 h-12 w-12 rounded-lg object-cover"
          />
        {/if}
        <p class="font-bold text-brand-400">{champion.name}</p>
      </div>
    </div>
  </div>
</div>
