<script lang="ts">
  let { distribution = [], totalVotes = 0, label = '' }: {
    distribution: number[];
    totalVotes: number;
    label?: string;
  } = $props();

  const maxCount = $derived(Math.max(...distribution, 1));
</script>

<div class="histogram">
  {#if label}
    <p class="mb-4 text-center text-2xl font-bold text-white drop-shadow-lg">{label}</p>
  {/if}

  <div class="flex items-end justify-center gap-2" style="height: 200px;">
    {#each distribution as count, i}
      <div class="flex flex-col items-center gap-1">
        <span class="text-sm font-bold text-white drop-shadow-md">
          {count > 0 ? count : ''}
        </span>
        <div
          class="bar w-12 rounded-t-lg bg-gradient-to-t from-purple-700 to-purple-400"
          style="height: {(count / maxCount) * 180}px; transition: height 0.3s ease-out;"
        ></div>
        <span class="text-lg font-bold text-white drop-shadow-md">{i + 1}</span>
      </div>
    {/each}
  </div>

  <div class="mt-4 text-center">
    <span class="rounded-full bg-black/50 px-4 py-1 text-sm text-gray-300">
      {totalVotes} votes
    </span>
  </div>
</div>

<style>
  .bar {
    min-height: 4px;
  }
</style>
