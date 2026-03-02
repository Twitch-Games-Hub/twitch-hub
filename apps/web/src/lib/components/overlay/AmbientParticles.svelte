<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Application } from 'pixi.js';
  import { GeometricParticleSystem, AMBIENT_FIELD } from '$lib/canvas';
  import { gridOverlay, type GridOverlay } from '$lib/canvas/effects/grid-overlay';

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  onMount(() => {
    const app = pixiCtx.app;
    if (!app) return;

    const particles = new GeometricParticleSystem(app);
    particles.startAmbient(AMBIENT_FIELD);

    const grid: GridOverlay = gridOverlay(app);

    return () => {
      particles.stopAmbient();
      particles.destroy();
      grid.destroy();
    };
  });
</script>
