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
  <div class="splash-wrapper relative">
    <!-- Radial burst -->
    <div class="radial-burst"></div>

    <!-- Left accent line -->
    <div class="accent-line accent-line-left"></div>

    <!-- Right accent line -->
    <div class="accent-line accent-line-right"></div>

    <!-- Content -->
    <div class="animate-scale-in-overshoot relative text-center">
      <p class="text-lg font-semibold tracking-wider text-brand-300 uppercase">Round</p>
      <p class="mt-1 text-7xl font-black tabular-nums text-white">{roundNumber}</p>
      <p class="mt-2 text-base tabular-nums text-text-muted">of {totalRounds}</p>
    </div>
  </div>
</div>

<style>
  .splash-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radial-burst {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(145, 70, 255, 0.3) 0%, transparent 70%);
    animation: scale-in-overshoot 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    transform: scale(0);
    pointer-events: none;
  }

  .accent-line {
    position: absolute;
    height: 1px;
    width: 0;
    top: 50%;
    background: rgba(145, 70, 255, 0.6);
    animation: line-extend 0.4s ease-out 0.2s forwards;
  }

  .accent-line-left {
    right: calc(50% + 60px);
    transform-origin: right;
  }

  .accent-line-right {
    left: calc(50% + 60px);
    transform-origin: left;
  }
</style>
