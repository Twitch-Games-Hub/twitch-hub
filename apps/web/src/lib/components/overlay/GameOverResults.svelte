<script lang="ts">
  import type { GameType, FinalResults } from '@twitch-hub/shared-types';
  import BracketViz from './BracketViz.svelte';
  import Leaderboard from './Leaderboard.svelte';
  import Histogram from './Histogram.svelte';
  import TugOfWar from './TugOfWar.svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { extractBinaryPercents } from '$lib/utils/votes';

  let {
    gameType,
    finalResults,
    gameTitle,
  }: {
    gameType: GameType;
    finalResults: FinalResults;
    gameTitle?: string;
  } = $props();

  const lastRound = $derived(
    finalResults.rounds.length > 0 ? finalResults.rounds[finalResults.rounds.length - 1] : null,
  );

  const blindTestLeaderboard = $derived.by(() => {
    if (gameType !== 'BLIND_TEST') return [];
    const aggregated = new SvelteMap<string, number>();
    for (const round of finalResults.rounds) {
      if (round.percentages) {
        for (const [userId, score] of Object.entries(round.percentages)) {
          aggregated.set(userId, (aggregated.get(userId) ?? 0) + score);
        }
      }
    }
    return Array.from(aggregated.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
  });
</script>

<div class="w-full max-w-2xl animate-scale-in">
  <!-- Header card -->
  <div class="mb-4 rounded-2xl bg-black/70 p-6 text-center backdrop-blur-sm">
    <h2
      class="bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-3xl font-bold text-transparent"
    >
      Game Over!
    </h2>
    {#if gameTitle}
      <p class="mt-1 text-base text-text-secondary">{gameTitle}</p>
    {/if}
    <p class="mt-2 text-sm tabular-nums text-text-muted">
      {finalResults.totalParticipants} participants
    </p>
  </div>

  <!-- Game-type-specific results -->
  <div class="rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
    {#if gameType === 'RANKING' && finalResults.ranking}
      <div class="mb-4 flex flex-col items-center">
        <div class="animate-trophy-bounce mb-2 text-5xl">🏆</div>
        {#if finalResults.ranking.champion.imageUrl}
          <img
            src={finalResults.ranking.champion.imageUrl}
            alt={finalResults.ranking.champion.name}
            class="mb-2 h-16 w-16 rounded-xl object-cover"
          />
        {/if}
        <p class="text-xl font-bold text-brand-400">{finalResults.ranking.champion.name}</p>
        <p class="text-sm text-text-muted">Champion</p>
      </div>
      <BracketViz
        matchups={finalResults.ranking.matchups}
        bracketSize={finalResults.ranking.bracketSize}
        champion={finalResults.ranking.champion}
      />
    {:else if gameType === 'BLIND_TEST'}
      <Leaderboard entries={blindTestLeaderboard} title="Final Leaderboard" />
    {:else if gameType === 'HOT_TAKE' && lastRound?.distribution}
      <h3 class="mb-3 text-center text-sm font-semibold text-text-muted uppercase">
        Final Round Distribution
      </h3>
      <Histogram distribution={lastRound.distribution} totalVotes={lastRound.totalResponses} />
    {:else if gameType === 'BALANCE' && lastRound}
      {@const split = extractBinaryPercents(lastRound)}
      {#if split}
        <h3 class="mb-3 text-center text-sm font-semibold text-text-muted uppercase">
          Final Round Results
        </h3>
        <TugOfWar
          percentA={split.percentA}
          percentB={split.percentB}
          labelA="A"
          labelB="B"
          totalVotes={split.totalVotes}
        />
      {/if}
    {:else}
      <p class="text-center text-text-muted">
        {finalResults.rounds.length} rounds completed
      </p>
    {/if}
  </div>
</div>
