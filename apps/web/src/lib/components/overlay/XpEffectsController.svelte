<script lang="ts">
  import { getContext } from 'svelte';
  import type { Application } from 'pixi.js';
  import { gameStore } from '$lib/stores/game.svelte';
  import { spawnFloatingXp } from '$lib/canvas/effects/floating-xp';
  import { playLevelUpEffect } from '$lib/canvas/effects/level-up-effect';
  import { playRankUpEffect } from '$lib/canvas/effects/rank-up-effect';
  import { shouldAnimate } from '$lib/canvas/reduced-motion';
  import { COLORS } from '$lib/canvas/theme';
  import type { RankUpEventData } from '@twitch-hub/shared-types';

  const pixiCtx = getContext<{ readonly app: Application | null }>('pixi-app');

  // Watch roundXpSummary — spawn floating +XP for each player
  $effect(() => {
    const summary = gameStore.roundXpSummary;
    if (!summary || !pixiCtx.app || !shouldAnimate()) return;

    const app = pixiCtx.app;
    const entries = Object.values(summary.playerXp);
    const viewportW = app.screen.width;
    const viewportH = app.screen.height;

    entries.forEach((entry, i) => {
      if (entry.roundXp <= 0) return;

      setTimeout(() => {
        const x = Math.random() * (viewportW * 0.8) + viewportW * 0.1;
        const y = viewportH * 0.67 + Math.random() * (viewportH * 0.15);

        const isStreaked = entry.multiplier > 1;
        spawnFloatingXp(app, x, y, entry.roundXp, {
          color: isStreaked ? COLORS.gold : undefined,
          fontSize: isStreaked ? 22 : undefined,
        });
      }, i * 50);
    });
  });

  // Watch gamificationQueue — consume level_up and rank_up events
  $effect(() => {
    const queue = gameStore.gamificationQueue;
    if (queue.length === 0 || !pixiCtx.app || !shouldAnimate()) return;

    const app = pixiCtx.app;
    const event = queue[0];

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    if (event.type === 'level_up') {
      playLevelUpEffect(app, centerX, centerY);
      gameStore.dequeueGamificationEvent();
    } else if (event.type === 'rank_up') {
      const data = event.data as RankUpEventData;
      playRankUpEffect(app, data.newRank, centerX, centerY);
      gameStore.dequeueGamificationEvent();
    } else {
      // Consume events we don't handle to avoid blocking the queue
      gameStore.dequeueGamificationEvent();
    }
  });
</script>
