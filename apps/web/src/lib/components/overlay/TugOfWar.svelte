<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Application } from 'pixi.js';
  import { Graphics } from 'pixi.js';
  import TweenedNumber from '$lib/components/ui/TweenedNumber.svelte';
  import {
    metallicFill,
    glow,
    GeometricParticleSystem,
    SPARK,
    VOTE_BURST,
    COLORS,
    type MetallicFill,
    type GlowEffect,
  } from '$lib/canvas';

  let {
    percentA = 0,
    percentB = 0,
    labelA = '',
    labelB = '',
    totalVotes = 0,
    imageA,
    imageB,
  }: {
    percentA: number;
    percentB: number;
    labelA: string;
    labelB: string;
    totalVotes: number;
    imageA?: string | null;
    imageB?: string | null;
  } = $props();

  const clampedA = $derived(Math.max(0, Math.min(100, percentA)));
  const clampedB = $derived(Math.max(0, Math.min(100, percentB)));
  const isClose = $derived(Math.abs(clampedA - clampedB) < 10);
  const knotLeft = $derived(totalVotes === 0 ? 50 : clampedA);

  const aLeading = $derived(clampedA > clampedB);
  const bLeading = $derived(clampedB > clampedA);

  const votesA = $derived(totalVotes > 0 ? Math.round((clampedA / 100) * totalVotes) : 0);
  const votesB = $derived(totalVotes > 0 ? Math.round((clampedB / 100) * totalVotes) : 0);

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  let barContainer: HTMLDivElement | undefined = $state();

  // Canvas effect instances
  let fillA: MetallicFill | null = $state(null);
  let fillB: MetallicFill | null = $state(null);
  let knotGlow: GlowEffect | null = $state(null);
  let ropeTexture: Graphics | null = $state(null);
  let particles: GeometricParticleSystem | null = $state(null);

  // Throttle state for vote bursts
  let lastBurstA = 0;
  let lastBurstB = 0;
  let prevTotalVotes = 0;
  let prevVotesA = 0;

  onMount(() => {
    const app = pixiCtx?.app;
    if (!app) return;

    particles = new GeometricParticleSystem(app);

    // Create metallic fills for bars
    fillA = metallicFill(app, { x: 0, y: 0, width: 0, height: 0 }, COLORS.brand);
    fillB = metallicFill(app, { x: 0, y: 0, width: 0, height: 0 }, 0xec4899);

    // Create knot glow
    knotGlow = glow(app, 0, 0, 20, COLORS.brand);

    // Create rope cross-hatch texture on canvas
    ropeTexture = new Graphics();
    ropeTexture.alpha = 0.08;
    app.stage.addChild(ropeTexture);

    return () => {
      fillA?.destroy();
      fillB?.destroy();
      knotGlow?.destroy();
      particles?.destroy();
      if (ropeTexture) {
        app.stage.removeChild(ropeTexture);
        ropeTexture.destroy();
      }
    };
  });

  // Sync canvas positions with DOM layout
  $effect(() => {
    // Read reactive values to establish dependencies
    const _a = clampedA;
    const _b = clampedB;
    const _kl = knotLeft;
    const _tv = totalVotes;

    if (!barContainer || !fillA || !fillB || !knotGlow || !ropeTexture) return;

    const rect = barContainer.getBoundingClientRect();
    const barX = rect.left;
    const barY = rect.top;
    const barW = rect.width;
    const barH = rect.height;

    // Update left fill (A side, from left)
    const widthA = (clampedA / 100) * barW;
    fillA.update({ x: barX, y: barY, width: widthA, height: barH });

    // Update right fill (B side, from right)
    const widthB = (clampedB / 100) * barW;
    fillB.update({ x: barX + barW - widthB, y: barY, width: widthB, height: barH });

    // Update knot glow position
    const knotX = barX + (knotLeft / 100) * barW;
    const knotY = barY + barH / 2;
    knotGlow.moveTo(knotX, knotY);

    // Draw rope cross-hatch pattern on canvas
    drawRopeTexture(ropeTexture, barX, barY, barW, barH);
  });

  // SPARK particles at knot when sides are close
  $effect(() => {
    if (!isClose || totalVotes === 0 || !particles || !barContainer) return;

    const rect = barContainer.getBoundingClientRect();
    const knotX = rect.left + (knotLeft / 100) * rect.width;
    const knotY = rect.top + rect.height / 2;

    const interval = setInterval(() => {
      if (particles && isClose && totalVotes > 0) {
        particles.burst(knotX, knotY, SPARK);
      }
    }, 200);

    return () => clearInterval(interval);
  });

  // VOTE_BURST on vote side (throttled to 100ms)
  $effect(() => {
    const currentTotalVotes = totalVotes;
    const currentVotesA = votesA;

    if (currentTotalVotes <= prevTotalVotes || !particles || !barContainer) {
      prevTotalVotes = currentTotalVotes;
      prevVotesA = currentVotesA;
      return;
    }

    const rect = barContainer.getBoundingClientRect();
    const now = Date.now();

    // Determine which side got the vote
    if (currentVotesA > prevVotesA) {
      // Vote went to A side
      if (now - lastBurstA >= 100) {
        const widthA = (clampedA / 100) * rect.width;
        particles.burst(rect.left + widthA, rect.top + rect.height / 2, VOTE_BURST);
        lastBurstA = now;
      }
    } else {
      // Vote went to B side
      if (now - lastBurstB >= 100) {
        const widthB = (clampedB / 100) * rect.width;
        particles.burst(rect.left + rect.width - widthB, rect.top + rect.height / 2, VOTE_BURST);
        lastBurstB = now;
      }
    }

    prevTotalVotes = currentTotalVotes;
    prevVotesA = currentVotesA;
  });

  function drawRopeTexture(g: Graphics, x: number, y: number, w: number, h: number): void {
    g.clear();
    const spacing = 8;
    // Diagonal cross-hatch lines
    for (let i = -h; i < w + h; i += spacing) {
      g.moveTo(x + i, y);
      g.lineTo(x + i + h, y + h);
      g.moveTo(x + i + h, y);
      g.lineTo(x + i, y + h);
    }
    g.stroke({ color: 0xffffff, width: 1 });
  }
</script>

<div
  class="flex w-full flex-col gap-3 rounded-lg bg-surface-secondary/80 p-6 shadow-2xl backdrop-blur-sm"
  role="img"
  aria-label="{labelA} {Math.round(clampedA)}% vs {labelB} {Math.round(
    clampedB,
  )}%. {totalVotes} total votes."
>
  <!-- Header: labels + percentages + total -->
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-1 items-center gap-2">
      {#if imageA}
        <img
          src={imageA}
          alt={labelA}
          loading="lazy"
          class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          onerror={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      {/if}
      <div>
        <div class="text-lg font-bold text-white">{labelA}</div>
        <div class="tabular-nums text-sm text-brand-400"><TweenedNumber value={clampedA} />%</div>
      </div>
    </div>

    <div class="tabular-nums text-sm text-white/60">
      Total: <TweenedNumber value={totalVotes} />
    </div>

    <div class="flex flex-1 items-center justify-end gap-2">
      <div class="text-right">
        <div class="text-lg font-bold text-white">{labelB}</div>
        <div class="tabular-nums text-sm text-pink-400"><TweenedNumber value={clampedB} />%</div>
      </div>
      {#if imageB}
        <img
          src={imageB}
          alt={labelB}
          loading="lazy"
          class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          onerror={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      {/if}
    </div>
  </div>

  <!-- Rope track -->
  <div
    bind:this={barContainer}
    class="relative h-14 w-full overflow-hidden rounded-full bg-surface-elevated shadow-lg"
  >
    <!-- Knot marker (HTML positioned, canvas glow handled separately) -->
    <div
      class="knot-marker absolute top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white shadow-lg transition-all duration-500 ease-out"
      class:animate-tow-wobble={isClose && totalVotes > 0}
      style="left: {knotLeft}%;"
    >
      <div class="absolute inset-1 rounded-full bg-white/80 shadow-inner"></div>
    </div>
  </div>

  <!-- Footer: vote counts per side -->
  <div class="flex justify-between font-mono text-xs tabular-nums text-white/40">
    <span><TweenedNumber value={votesA} /> votes</span>
    <span><TweenedNumber value={votesB} /> votes</span>
  </div>
</div>
