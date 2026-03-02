<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Application } from 'pixi.js';
  import type {
    GameType,
    FinalResults,
    SessionXpSummary,
    LeaderboardEntry,
  } from '@twitch-hub/shared-types';
  import BracketViz from './BracketViz.svelte';
  import Leaderboard from './Leaderboard.svelte';
  import Histogram from './Histogram.svelte';
  import TugOfWar from './TugOfWar.svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { extractBinaryPercents } from '$lib/utils/votes';
  import { GeometricParticleSystem, CELEBRATION } from '$lib/canvas';

  let {
    gameType,
    finalResults,
    gameTitle,
    sessionSummary = null,
    leaderboard = [],
  }: {
    gameType: GameType;
    finalResults: FinalResults;
    gameTitle?: string;
    sessionSummary?: SessionXpSummary | null;
    leaderboard?: LeaderboardEntry[];
  } = $props();

  function formatXpReason(reason: string): string {
    const labels: Record<string, string> = {
      PARTICIPATION: 'Participation',
      ROUND_RESPONSE: 'Round Responses',
      CORRECT_ANSWER: 'Correct Answers',
      SPEED_BONUS: 'Speed Bonus',
      STREAK_BONUS: 'Streak Multiplier Bonus',
      MAJORITY_VOTER: 'Majority Voter',
      SESSION_COMPLETION: 'Session Completion',
      FIRST_RESPONDER: 'First Responder',
    };
    return labels[reason] ?? reason;
  }

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

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  onMount(() => {
    const app = pixiCtx?.app;
    if (!app) return;

    // Fire CELEBRATION particle burst at viewport center on mount
    const particles = new GeometricParticleSystem(app);
    const cx = app.screen.width / 2;
    const cy = app.screen.height / 3;
    particles.burst(cx, cy, CELEBRATION);

    // Auto-cleanup after particles finish
    const timer = setTimeout(() => {
      particles.destroy();
    }, 1600);

    return () => {
      clearTimeout(timer);
      particles.destroy();
    };
  });
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

  <!-- Session XP Leaderboard -->
  {#if leaderboard.length > 0}
    <div
      class="stagger-reveal mt-4 rounded-2xl bg-black/70 p-6 backdrop-blur-sm"
      style="animation-delay: 1200ms;"
    >
      <h3 class="mb-3 text-center text-sm font-semibold text-text-muted uppercase">
        Session XP Leaderboard
      </h3>
      <Leaderboard
        entries={leaderboard.map((e) => ({ userId: e.playerId, score: e.xp }))}
        title="XP Earned"
      />
    </div>
  {/if}

  <!-- Personal XP Breakdown -->
  {#if sessionSummary}
    <div
      class="stagger-reveal mt-4 rounded-2xl bg-black/70 p-6 backdrop-blur-sm"
      style="animation-delay: 1600ms;"
    >
      <h3 class="mb-3 text-center text-sm font-semibold text-text-muted uppercase">
        Your XP Breakdown
      </h3>
      {#each Object.entries(sessionSummary.breakdown) as [reason, xp] (reason)}
        <div class="flex justify-between py-1 text-sm text-text-secondary">
          <span>{formatXpReason(reason)}</span>
          <span class="font-semibold tabular-nums text-brand-400">+{xp}</span>
        </div>
      {/each}
      <div
        class="mt-2 flex justify-between border-t border-white/20 pt-2 text-base font-bold text-white"
      >
        <span>Total</span>
        <span class="tabular-nums text-brand-300">+{sessionSummary.total} XP</span>
      </div>
    </div>
  {/if}
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
</style>
