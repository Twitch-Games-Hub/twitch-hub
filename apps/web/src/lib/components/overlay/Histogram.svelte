<script lang="ts">
  import TweenedNumber from '$lib/components/ui/TweenedNumber.svelte';

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
      {@const isLeading = count === maxCount && count > 0}
      {@const glowIntensity = maxCount > 0 ? count / maxCount : 0}
      <div class="flex flex-col items-center gap-1">
        <span
          class="tabular-nums font-bold text-white drop-shadow-md {compact ? 'text-xs' : 'text-sm'}"
        >
          {#if count > 0}<TweenedNumber value={count} />{/if}
        </span>
        <div
          class="bar {compact
            ? 'w-6'
            : 'w-12'} rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-400"
          class:bar-leading={isLeading}
          style="height: {(count / maxCount) *
            barHeight}px; transition: height 0.3s ease-out; transform-origin: bottom; --glow-intensity: {glowIntensity}; --glow-color: rgba(145, 70, 255, {0.2 +
            glowIntensity * 0.4});"
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

<style>
  .bar {
    min-height: 4px;
    box-shadow: 0 0 calc(var(--glow-intensity, 0) * 12px) var(--glow-color, transparent);
    transition:
      height 0.3s ease-out,
      box-shadow 0.3s ease-out;
  }

  .bar-leading {
    animation: bar-pulse-glow 1.5s ease-in-out infinite;
    position: relative;
    overflow: hidden;
  }

  .bar-leading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgba(255, 255, 255, 0.25) 50%,
      transparent 60%
    );
    animation: shimmer-sweep 2s ease-in-out infinite;
  }
</style>
