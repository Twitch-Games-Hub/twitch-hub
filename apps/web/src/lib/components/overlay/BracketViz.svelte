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

  const sparkles = [
    { sx: '24px', sy: '-24px' },
    { sx: '-24px', sy: '-24px' },
    { sx: '24px', sy: '24px' },
    { sx: '-24px', sy: '24px' },
  ];
</script>

<div class="bracket-viz overflow-x-auto">
  <div class="flex gap-6 min-w-max items-center">
    {#each Array(totalLevels) as _, level (level)}
      <div class="bracket-level flex flex-col gap-4">
        <h4 class="text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
          {getLevelName(level)}
        </h4>
        {#each getMatchupsAtLevel(level) as matchup (matchup.matchupIndex)}
          <div
            class="matchup-card animate-fade-in rounded-lg border border-border-default bg-surface-secondary p-3 text-sm min-w-[180px]"
            style="animation-delay: {level * 150}ms; animation-fill-mode: both;"
          >
            <div
              class="flex items-center justify-between gap-2 rounded px-1 {matchup.winnerId ===
              matchup.itemA.id
                ? 'font-semibold text-brand-400'
                : 'text-text-secondary'}"
              class:winner-row={matchup.winnerId === matchup.itemA.id}
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
              class="flex items-center justify-between gap-2 rounded px-1 {matchup.winnerId ===
              matchup.itemB.id
                ? 'font-semibold text-brand-400'
                : 'text-text-secondary'}"
              class:winner-row={matchup.winnerId === matchup.itemB.id}
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
        class="champion-card relative rounded-lg border-2 border-brand-400 bg-brand-600/10 p-4 text-center min-w-[140px]"
      >
        <!-- Sparkle burst dots -->
        {#each sparkles as sparkle, i}
          <span
            class="sparkle-dot"
            style="--sx: {sparkle.sx}; --sy: {sparkle.sy}; animation-delay: {i * 100}ms;"
          ></span>
        {/each}

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

<style>
  .winner-row {
    box-shadow: 0 0 8px rgba(145, 70, 255, 0.3);
    border-radius: 4px;
  }

  .champion-card {
    animation: champion-glow 2s ease-in-out infinite;
  }

  .sparkle-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(145, 70, 255, 0.8);
    animation: sparkle-burst 0.6s ease-out forwards;
    pointer-events: none;
  }

  .bracket-level {
    position: relative;
  }

  .bracket-level:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -12px;
    top: 50%;
    width: 12px;
    height: 1px;
    background: rgba(145, 70, 255, 0.3);
  }
</style>
