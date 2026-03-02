<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Application } from 'pixi.js';
  import { shockwave, GeometricParticleSystem, SHOCKWAVE_DEBRIS } from '$lib/canvas';

  let {
    roundNumber,
    totalRounds,
    onDone,
  }: {
    roundNumber: number;
    totalRounds: number;
    onDone: () => void;
  } = $props();

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  onMount(() => {
    const timer = setTimeout(onDone, 1500);

    const app = pixiCtx?.app;
    if (app) {
      const cx = app.screen.width / 2;
      const cy = app.screen.height / 2;

      shockwave(app, cx, cy);

      const particles = new GeometricParticleSystem(app);
      particles.burst(cx, cy, SHOCKWAVE_DEBRIS);

      // Auto-clean particle system after effects complete (~600ms)
      const cleanupTimer = setTimeout(() => {
        particles.destroy();
      }, 600);

      return () => {
        clearTimeout(timer);
        clearTimeout(cleanupTimer);
        particles.destroy();
      };
    }

    return () => clearTimeout(timer);
  });
</script>

<div class="fixed inset-0 z-40 flex items-center justify-center">
  <div class="splash-wrapper relative">
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
</style>
