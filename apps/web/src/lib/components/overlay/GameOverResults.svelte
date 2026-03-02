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

  const trophySparkles = [
    { sx: '20px', sy: '-25px' },
    { sx: '-20px', sy: '-25px' },
    { sx: '28px', sy: '10px' },
    { sx: '-28px', sy: '10px' },
    { sx: '10px', sy: '28px' },
    { sx: '-10px', sy: '28px' },
  ];
</script>

<div class="w-full max-w-2xl">
  <!-- Header card - Phase 1: title (0ms delay) -->
  <div
    class="stagger-reveal mb-4 rounded-2xl bg-black/70 p-6 text-center backdrop-blur-sm"
    style="animation-delay: 0ms;"
  >
    <h2
      class="gradient-shimmer-text bg-gradient-to-r from-brand-400 via-brand-200 to-brand-400 bg-clip-text text-3xl font-bold text-transparent"
    >
      Game Over!
    </h2>
    {#if gameTitle}
      <!-- Phase 2: subtitle (400ms delay) -->
      <div class="stagger-reveal" style="animation-delay: 400ms;">
        <p class="mt-1 text-base text-text-secondary">{gameTitle}</p>
      </div>
    {/if}
    <div class="stagger-reveal" style="animation-delay: 400ms;">
      <p class="mt-2 text-sm tabular-nums text-text-muted">
        {finalResults.totalParticipants} participants
      </p>
    </div>
  </div>

  <!-- Game-type-specific results - Phase 3: results card (800ms delay) -->
  <div
    class="stagger-reveal rounded-2xl bg-black/70 p-6 backdrop-blur-sm"
    style="animation-delay: 800ms;"
  >
    {#if gameType === 'RANKING' && finalResults.ranking}
      <div class="mb-4 flex flex-col items-center">
        <div class="relative mb-2">
          <div class="animate-trophy-bounce text-5xl">🏆</div>
          <!-- Trophy sparkle burst -->
          {#each trophySparkles as sparkle, i (i)}
            <span
              class="sparkle-dot"
              style="--sx: {sparkle.sx}; --sy: {sparkle.sy}; animation-delay: {300 + i * 80}ms;"
            ></span>
          {/each}
        </div>
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

<style>
  .stagger-reveal {
    opacity: 0;
    animation: slide-up 0.4s ease-out forwards;
  }

  .gradient-shimmer-text {
    background-size: 200% auto;
    animation: gradient-shimmer 3s linear infinite;
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
</style>
