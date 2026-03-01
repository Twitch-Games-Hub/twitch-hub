<script lang="ts">
  import TweenedNumber from '$lib/components/ui/TweenedNumber.svelte';

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

  const knotShadowColor = $derived(
    aLeading
      ? 'rgba(145, 70, 255, 0.5)'
      : bLeading
        ? 'rgba(236, 72, 153, 0.5)'
        : 'rgba(255, 255, 255, 0.2)',
  );
  const knotShadowSpread = $derived(isClose ? '12px' : '6px');
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
  <div class="relative h-14 w-full overflow-hidden rounded-full bg-surface-elevated shadow-lg">
    <!-- Left fill -->
    <div
      class="absolute inset-y-0 left-0 bg-brand-500/80 transition-all duration-500 ease-out"
      class:leading-side-shimmer={aLeading && totalVotes > 0}
      style="width: {clampedA}%;"
    ></div>

    <!-- Right fill -->
    <div
      class="absolute inset-y-0 right-0 bg-pink-500/80 transition-all duration-500 ease-out"
      class:leading-side-shimmer={bLeading && totalVotes > 0}
      style="width: {clampedB}%;"
    ></div>

    <!-- Rope texture overlay -->
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="rope-lines"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke="white" stroke-width="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#rope-lines)" />
    </svg>

    <!-- Momentum chevrons -->
    {#if totalVotes > 0 && (aLeading || bLeading)}
      <div
        class="chevron chevron-left"
        class:active={aLeading}
        style="left: calc({knotLeft}% - 28px);"
      ></div>
      <div
        class="chevron chevron-right"
        class:active={bLeading}
        style="left: calc({knotLeft}% + 18px);"
      ></div>
    {/if}

    <!-- Knot marker -->
    <div
      class="knot-marker absolute top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white shadow-lg transition-all duration-500 ease-out"
      class:animate-tow-wobble={isClose && totalVotes > 0}
      style="left: {knotLeft}%; box-shadow: 0 0 {knotShadowSpread} {knotShadowColor};"
    >
      <div class="absolute inset-1 rounded-full bg-white/80 shadow-inner"></div>
      <!-- Glow line -->
      <div class="knot-glow-line" class:knot-glow-pulse={isClose && totalVotes > 0}></div>
    </div>
  </div>

  <!-- Footer: vote counts per side -->
  <div class="flex justify-between font-mono text-xs tabular-nums text-white/40">
    <span><TweenedNumber value={votesA} /> votes</span>
    <span><TweenedNumber value={votesB} /> votes</span>
  </div>
</div>

<style>
  .leading-side-shimmer {
    position: relative;
    overflow: hidden;
  }

  .leading-side-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgba(255, 255, 255, 0.12) 50%,
      transparent 60%
    );
    animation: shimmer-sweep 2.5s ease-in-out infinite;
  }

  .chevron {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    opacity: 0;
    z-index: 5;
    transition:
      left 0.5s ease-out,
      opacity 0.3s ease;
  }

  .chevron-left {
    border-right: 8px solid rgba(145, 70, 255, 0.7);
  }

  .chevron-right {
    border-left: 8px solid rgba(236, 72, 153, 0.7);
  }

  .chevron-left.active {
    animation: momentum-pulse-left 1s ease-in-out infinite;
    opacity: 1;
  }

  .chevron-right.active {
    animation: momentum-pulse-right 1s ease-in-out infinite;
    opacity: 1;
  }

  .knot-glow-line {
    position: absolute;
    left: 50%;
    top: -8px;
    bottom: -8px;
    width: 2px;
    transform: translateX(-50%);
    background: rgba(145, 70, 255, 0.4);
    border-radius: 1px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .knot-glow-pulse {
    opacity: 1;
    animation: bar-pulse-glow 1.5s ease-in-out infinite;
  }
</style>
