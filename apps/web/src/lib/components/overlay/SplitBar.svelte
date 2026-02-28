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

<div class="flex flex-col gap-4 w-full p-6 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-2xl">
  <!-- Labels and Vote Counts -->
  <div class="flex justify-between items-center gap-4">
    <div class="flex-1">
      <div class="text-white font-bold text-lg">{labelA}</div>
      <div class="text-purple-400 text-sm">{Math.round(clampedPercentA)}%</div>
    </div>
    <div class="text-white/60 text-sm font-mono">Total: {totalVotes}</div>
    <div class="flex-1 text-right">
      <div class="text-white font-bold text-lg">{labelB}</div>
      <div class="text-pink-400 text-sm">{Math.round(clampedPercentB)}%</div>
    </div>
  </div>

  <!-- Split Bar -->
  <div class="w-full h-12 bg-gray-800 rounded-full overflow-hidden shadow-lg">
    <div class="flex h-full">
      <!-- Option A Bar -->
      <div
        class="bg-purple-500 transition-all duration-500 ease-out shadow-lg"
        style="width: {clampedPercentA}%;"
      ></div>
      <!-- Option B Bar -->
      <div
        class="bg-pink-500 transition-all duration-500 ease-out shadow-lg"
        style="width: {clampedPercentB}%;"
      ></div>
    </div>
  </div>

  <!-- Additional Stats -->
  <div class="flex justify-between text-xs text-white/40 font-mono">
    <span>A: {Math.round((clampedPercentA / 100) * totalVotes)} votes</span>
    <span>B: {Math.round((clampedPercentB / 100) * totalVotes)} votes</span>
  </div>
</div>

<style>
  :global(body) {
    font-family: inherit;
  }
</style>
