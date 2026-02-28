<script lang="ts">
  let {
    items = [],
    currentMatchup = null,
    results = [],
    totalRounds = 0,
  }: {
    items: string[];
    currentMatchup: [string, string] | null;
    results: { winner: string; round: number }[];
    totalRounds: number;
  } = $props();

  const bracket = $derived.by(() => {
    const rounds: { id: string; left: string | null; right: string | null }[][] = [];

    const firstRound = [];
    for (let i = 0; i < items.length; i += 2) {
      firstRound.push({
        id: `r0-m${i / 2}`,
        left: items[i] || null,
        right: items[i + 1] || null,
      });
    }
    rounds.push(firstRound);

    for (let r = 1; r < totalRounds; r++) {
      const prev = rounds[r - 1];
      const next = [];
      for (let i = 0; i < prev.length; i += 2) {
        next.push({
          id: `r${r}-m${next.length}`,
          left: null,
          right: null,
        });
      }
      rounds.push(next);
    }

    return rounds;
  });

  const isActive = (roundIdx: number, matchIdx: number) => {
    if (!currentMatchup) return false;
    const match = bracket[roundIdx]?.[matchIdx];
    return match?.left === currentMatchup[0] && match?.right === currentMatchup[1];
  };

  const isWinner = (item: string | null) => {
    if (!item) return false;
    return results.some((r) => r.winner === item);
  };
</script>

<div class="space-y-6 p-6">
  {#each bracket as round, roundIdx}
    <div>
      <div class="mb-2 text-xs font-bold uppercase tracking-wider text-purple-400 drop-shadow-md">
        {roundIdx === bracket.length - 1 ? 'Finals' : `Round ${roundIdx + 1}`}
      </div>

      <div class="space-y-3">
        {#each round as match, matchIdx}
          {@const active = isActive(roundIdx, matchIdx)}
          <div
            class="rounded-lg border-2 p-3 transition-all duration-300 {active
              ? 'border-purple-500 bg-purple-900/40 ring-2 ring-purple-400'
              : 'border-gray-700 bg-gray-900/50'}"
          >
            <div class="flex items-center gap-2">
              <span
                class="flex-1 rounded px-2 py-1 text-sm font-semibold drop-shadow-lg {isWinner(
                  match.left,
                )
                  ? 'bg-green-700 text-green-100'
                  : 'bg-gray-700/50 text-white'}"
              >
                {match.left || 'TBD'}
              </span>
              <span class="text-xs font-bold text-gray-500">vs</span>
              <span
                class="flex-1 rounded px-2 py-1 text-sm font-semibold drop-shadow-lg {isWinner(
                  match.right,
                )
                  ? 'bg-green-700 text-green-100'
                  : 'bg-gray-700/50 text-white'}"
              >
                {match.right || 'TBD'}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if items.length === 0}
    <div class="py-12 text-center text-sm italic text-gray-500">Waiting for bracket data...</div>
  {/if}
</div>
