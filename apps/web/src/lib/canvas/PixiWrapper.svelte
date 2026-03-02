<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Application } from 'pixi.js';
  import { createPixiApp } from './pixi-app';

  let { children }: { children: Snippet } = $props();

  let canvasEl: HTMLCanvasElement;
  let app: Application | null = $state(null);

  setContext('pixi-app', {
    get app() {
      return app;
    },
  });

  onMount(() => {
    let destroyed = false;

    createPixiApp(canvasEl).then((pixiApp) => {
      if (destroyed) {
        pixiApp.destroy();
        return;
      }
      app = pixiApp;
    });

    return () => {
      destroyed = true;
      app?.destroy();
      app = null;
    };
  });
</script>

<canvas bind:this={canvasEl} class="pointer-events-none fixed inset-0 z-0" aria-hidden="true"
></canvas>
{@render children()}
