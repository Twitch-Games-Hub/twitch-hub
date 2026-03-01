<script lang="ts">
  import { onMount } from 'svelte';

  let { onDone }: { onDone?: () => void } = $props();

  const COLORS = ['#9146ff', '#22c55e', '#eab308', '#ef4444', '#60a5fa', '#f472b6', '#fb923c'];

  const pieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    left: Math.random() * 100, // vw %
    color: COLORS[i % COLORS.length],
    width: 5 + Math.random() * 7,
    height: 7 + Math.random() * 10,
    delay: Math.random() * 1.2,
    dur: 1.8 + Math.random() * 1.4,
    r: Math.random(), // rotation turns (used as CSS custom prop)
    x: (Math.random() - 0.5) * 140, // px horizontal drift
    round: Math.random() > 0.5, // circle vs rectangle
  }));

  onMount(() => {
    const maxDur = Math.max(...pieces.map((p) => p.delay + p.dur));
    const t = setTimeout(() => onDone?.(), (maxDur + 0.3) * 1000);
    return () => clearTimeout(t);
  });
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
  {#each pieces as p (p.id)}
    <div
      class="absolute top-0 animate-confetti-fall"
      style="
        left: {p.left}%;
        width: {p.width}px;
        height: {p.height}px;
        background: {p.color};
        border-radius: {p.round ? '50%' : '2px'};
        --dur: {p.dur}s;
        --delay: {p.delay}s;
        --r: {p.r};
        --x: {p.x}px;
      "
    ></div>
  {/each}
</div>
