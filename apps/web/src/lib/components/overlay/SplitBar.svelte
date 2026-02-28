<script lang="ts">
  let {
    percentA = 0,
    percentB = 0,
    labelA = '',
    labelB = '',
    totalVotes = 0,
  }: {
    percentA: number;
    percentB: number;
    labelA: string;
    labelB: string;
    totalVotes: number;
  } = $props();

  const clampedPercentA = $derived(Math.max(0, Math.min(100, percentA)));
  const clampedPercentB = $derived(Math.max(0, Math.min(100, percentB)));
</script>

<div
  class="flex w-full flex-col gap-4 rounded-lg bg-surface-secondary/80 p-6 shadow-2xl backdrop-blur-sm"
  role="img"
  aria-label="{labelA} {Math.round(clampedPercentA)}% vs {labelB} {Math.round(
    clampedPercentB,
  )}%. {totalVotes} total votes."
>
  <div class="flex items-center justify-between gap-4">
    <div class="flex-1">
      <div class="text-lg font-bold text-white">{labelA}</div>
      <div class="tabular-nums text-sm text-brand-400">{Math.round(clampedPercentA)}%</div>
    </div>
    <div class="tabular-nums text-sm text-white/60">Total: {totalVotes}</div>
    <div class="flex-1 text-right">
      <div class="text-lg font-bold text-white">{labelB}</div>
      <div class="tabular-nums text-sm text-pink-400">{Math.round(clampedPercentB)}%</div>
    </div>
  </div>

  <div class="h-12 w-full overflow-hidden rounded-full bg-surface-elevated shadow-lg">
    <div class="flex h-full">
      <div
        class="bg-brand-500 shadow-lg transition-all duration-500 ease-out"
        style="width: {clampedPercentA}%;"
      ></div>
      <div
        class="bg-pink-500 shadow-lg transition-all duration-500 ease-out"
        style="width: {clampedPercentB}%;"
      ></div>
    </div>
  </div>

  <div class="flex justify-between font-mono text-xs tabular-nums text-white/40">
    <span>A: {Math.round((clampedPercentA / 100) * totalVotes)} votes</span>
    <span>B: {Math.round((clampedPercentB / 100) * totalVotes)} votes</span>
  </div>
</div>
