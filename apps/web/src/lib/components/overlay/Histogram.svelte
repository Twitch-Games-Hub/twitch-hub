<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Application } from 'pixi.js';
  import TweenedNumber from '$lib/components/ui/TweenedNumber.svelte';
  import {
    metallicFill,
    glow,
    GeometricParticleSystem,
    VOTE_BURST,
    COLORS,
    type MetallicFill,
    type GlowEffect,
  } from '$lib/canvas';

  let {
    distribution = [],
    totalVotes = 0,
    label = '',
    compact = false,
  }: {
    distribution: number[];
    totalVotes: number;
    label?: string;
    compact?: boolean;
  } = $props();

  const maxCount = $derived(Math.max(...distribution, 1));
  const barHeight = $derived(compact ? 80 : 180);

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  // Track DOM elements for each bar
  let barRefs: (HTMLDivElement | undefined)[] = $state([]);

  // Canvas effect instances — $state for singletons so $effect re-runs after onMount
  let particles: GeometricParticleSystem | null = $state(null);
  let leadingGlow: GlowEffect | null = $state(null);

  // Non-reactive — managed imperatively
  let fills: MetallicFill[] = [];
  let lastBurstTimes: number[] = [];
  let prevDistribution: number[] = [];

  onMount(() => {
    const app = pixiCtx?.app;
    if (!app) return;

    particles = new GeometricParticleSystem(app);
    leadingGlow = glow(app, 0, 0, 24, COLORS.brand);
    leadingGlow.graphic.visible = false;

    return () => {
      fills.forEach((f) => f.destroy());
      fills = [];
      leadingGlow?.destroy();
      particles?.destroy();
    };
  });

  // Sync canvas bar positions with DOM layout
  $effect(() => {
    const app = pixiCtx?.app;
    const dist = distribution;
    const _tv = totalVotes;
    const _max = maxCount;

    if (!app || !leadingGlow) return;

    // Ensure correct number of metallic fills
    while (fills.length < dist.length) {
      fills.push(metallicFill(app, { x: 0, y: 0, width: 0, height: 0 }, COLORS.brand));
    }
    while (fills.length > dist.length) {
      fills.pop()?.destroy();
    }

    // Find leading bar index
    let leadIdx = -1;
    let maxVal = 0;
    for (let i = 0; i < dist.length; i++) {
      if (dist[i] > maxVal) {
        maxVal = dist[i];
        leadIdx = i;
      }
    }

    // Update fill positions from DOM
    for (let i = 0; i < fills.length; i++) {
      const el = barRefs[i];
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      fills[i].update({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }

    // Position leading glow at top-center of leading bar
    if (leadIdx >= 0 && barRefs[leadIdx]) {
      const rect = barRefs[leadIdx]!.getBoundingClientRect();
      leadingGlow.moveTo(rect.left + rect.width / 2, rect.top);
      leadingGlow.graphic.visible = true;
    } else {
      leadingGlow.graphic.visible = false;
    }
  });

  // VOTE_BURST detection — compare previous vs current distribution
  $effect(() => {
    const dist = distribution;
    const _tv = totalVotes;

    if (!particles) {
      prevDistribution = [...dist];
      return;
    }

    const now = Date.now();

    // Ensure tracking arrays match length
    while (lastBurstTimes.length < dist.length) lastBurstTimes.push(0);

    for (let i = 0; i < dist.length; i++) {
      const prev = prevDistribution[i] ?? 0;
      if (dist[i] > prev) {
        // Bar grew — fire burst at top if not throttled
        if (now - lastBurstTimes[i] >= 100) {
          const el = barRefs[i];
          if (el) {
            const rect = el.getBoundingClientRect();
            particles.burst(rect.left + rect.width / 2, rect.top, VOTE_BURST);
          }
          lastBurstTimes[i] = now;
        }
      }
    }

    prevDistribution = [...dist];
  });
</script>

<div role="img" aria-label="Vote distribution histogram. {totalVotes} total votes.">
  {#if label}
    <p class="mb-4 text-center text-2xl font-bold text-white drop-shadow-lg">{label}</p>
  {/if}

  <div
    class="flex items-end justify-center {compact ? 'gap-1' : 'gap-2'}"
    style="height: {barHeight + 20}px;"
  >
    {#each distribution as count, i (i)}
      <div class="flex flex-col items-center gap-1">
        <span
          class="tabular-nums font-bold text-white drop-shadow-md {compact ? 'text-xs' : 'text-sm'}"
        >
          {#if count > 0}<TweenedNumber value={count} />{/if}
        </span>
        <div
          bind:this={barRefs[i]}
          class="{compact ? 'w-6' : 'w-12'} rounded-t-lg"
          style="height: {(count / maxCount) * barHeight}px; min-height: 4px;"
        ></div>
        <span
          class="tabular-nums font-bold text-white drop-shadow-md {compact ? 'text-xs' : 'text-lg'}"
        >
          {i + 1}
        </span>
      </div>
    {/each}
  </div>

  <div class="mt-4 text-center">
    <span class="rounded-full bg-black/50 px-4 py-1 text-sm tabular-nums text-text-secondary">
      <TweenedNumber value={totalVotes} /> votes
    </span>
  </div>
</div>
