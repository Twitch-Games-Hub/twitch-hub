<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Application, Graphics } from 'pixi.js';
  import type { BracketMatchupResult } from '@twitch-hub/shared-types';
  import {
    lineDraw,
    glow,
    GeometricParticleSystem,
    CELEBRATION,
    WINNER_CROWN,
    COLORS,
    TIMING,
    type GlowEffect,
  } from '$lib/canvas';

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

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  // DOM refs for matchup cards and levels, keyed by level
  let levelRefs: (HTMLDivElement | undefined)[] = $state([]);
  let championRef: HTMLDivElement | undefined = $state();

  // Canvas effect instances
  let particles: GeometricParticleSystem | null = $state(null);
  let winnerGlows: GlowEffect[] = [];
  let championGlow: GlowEffect | null = null;
  let connectorLines: Graphics[] = [];
  let celebrationFired = false;

  onMount(() => {
    const app = pixiCtx?.app;
    if (!app) return;

    particles = new GeometricParticleSystem(app);

    return () => {
      connectorLines.forEach((l) => {
        app.stage.removeChild(l);
        l.destroy();
      });
      connectorLines = [];
      winnerGlows.forEach((g) => g.destroy());
      winnerGlows = [];
      championGlow?.destroy();
      championGlow = null;
      particles?.destroy();
    };
  });

  // Draw connector lines between bracket levels — sequentially by level
  $effect(() => {
    const app = pixiCtx?.app;
    const _m = matchups;
    const _levels = totalLevels;

    if (!app || levelRefs.length === 0) return;

    // Clean up previous connectors
    connectorLines.forEach((l) => {
      app.stage.removeChild(l);
      l.destroy();
    });
    connectorLines = [];

    // Draw connectors between adjacent levels
    for (let level = 0; level < totalLevels; level++) {
      const currentLevelEl = levelRefs[level];
      const nextLevelEl = levelRefs[level + 1] ?? championRef;

      if (!currentLevelEl || !nextLevelEl) continue;

      const currentCards = currentLevelEl.querySelectorAll('.matchup-card');
      const nextCards = nextLevelEl.querySelectorAll('.matchup-card, .champion-card');

      // Each pair of current-level cards feeds into one next-level card
      for (let j = 0; j < nextCards.length; j++) {
        const nextRect = nextCards[j].getBoundingClientRect();
        const nextMidY = nextRect.top + nextRect.height / 2;
        const nextLeft = nextRect.left;

        // Two source cards per destination
        const srcIdx = j * 2;
        for (let k = 0; k < 2; k++) {
          const srcCard = currentCards[srcIdx + k];
          if (!srcCard) continue;

          const srcRect = srcCard.getBoundingClientRect();
          const srcMidY = srcRect.top + srcRect.height / 2;
          const srcRight = srcRect.right;

          // Delay drawing based on level for sequential animation
          const delay = level * TIMING.SWEEP_DURATION;
          setTimeout(() => {
            if (!pixiCtx?.app) return;
            const line = lineDraw(
              app,
              { x: srcRight, y: srcMidY },
              { x: nextLeft, y: nextMidY },
              COLORS.brand,
              TIMING.SWEEP_DURATION,
            );
            connectorLines.push(line);
          }, delay);
        }
      }
    }
  });

  // Glow effect on winner rows and champion card
  $effect(() => {
    const app = pixiCtx?.app;
    const _m = matchups;

    if (!app) return;

    // Clean up previous glows
    winnerGlows.forEach((g) => g.destroy());
    winnerGlows = [];
    championGlow?.destroy();
    championGlow = null;

    // Glow on winner rows within matchup cards
    for (let level = 0; level < totalLevels; level++) {
      const levelEl = levelRefs[level];
      if (!levelEl) continue;

      const winnerRows = levelEl.querySelectorAll('.winner-row');
      winnerRows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        const g = glow(
          app,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          16,
          COLORS.brand,
        );
        winnerGlows.push(g);
      });
    }

    // Glow on champion card
    if (championRef) {
      const card = championRef.querySelector('.champion-card');
      if (card) {
        const rect = card.getBoundingClientRect();
        championGlow = glow(
          app,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          32,
          COLORS.brand,
        );
      }
    }
  });

  // Fire celebration effects on champion reveal
  $effect(() => {
    if (!champion || !championRef || !particles || celebrationFired) return;

    const card = championRef.querySelector('.champion-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // CELEBRATION particles
    particles.burst(cx, cy, CELEBRATION);

    // WINNER_CROWN fountain slightly delayed
    setTimeout(() => {
      if (particles) {
        particles.burst(cx, cy, WINNER_CROWN);
      }
    }, 300);

    celebrationFired = true;
  });
</script>

<div class="bracket-viz overflow-x-auto">
  <div class="flex gap-6 min-w-max items-center">
    {#each Array(totalLevels) as _, level (level)}
      <div bind:this={levelRefs[level]} class="bracket-level flex flex-col gap-4">
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
    <div bind:this={championRef} class="flex flex-col gap-4">
      <h4 class="text-center text-xs font-semibold text-brand-400 uppercase tracking-wider">
        Champion
      </h4>
      <div
        class="champion-card relative rounded-lg border-2 border-brand-400 bg-brand-600/10 p-4 text-center min-w-[140px]"
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
