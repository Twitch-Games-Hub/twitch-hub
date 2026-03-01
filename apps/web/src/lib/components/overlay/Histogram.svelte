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
          style="height: {(count / maxCount) *
            barHeight}px; transition: height 0.3s ease-out; transform-origin: bottom;"
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
  }
</style>
