<script lang="ts">
  import { onMount } from 'svelte';

  let {
    roundNumber,
    totalRounds,
    onDone,
  }: {
    roundNumber: number;
    totalRounds: number;
    onDone: () => void;
  } = $props();

  onMount(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  });
</script>

<div class="fixed inset-0 z-40 flex items-center justify-center">
  <div class="animate-scale-in text-center">
    <p class="text-lg font-semibold tracking-wider text-brand-300 uppercase">Round</p>
    <p class="mt-1 text-7xl font-black tabular-nums text-white">{roundNumber}</p>
    <p class="mt-2 text-base tabular-nums text-text-muted">of {totalRounds}</p>
  </div>
</div>
