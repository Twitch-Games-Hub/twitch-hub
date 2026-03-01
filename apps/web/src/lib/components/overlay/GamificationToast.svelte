<script lang="ts">
  import type { GamificationEvent } from '@twitch-hub/shared-types';
  import { onMount } from 'svelte';

  let { event }: { event: GamificationEvent } = $props();
  let visible = $state(true);

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
    }, 4000);
    return () => clearTimeout(timer);
  });

  let message = $derived(() => {
    switch (event.type) {
      case 'streak': {
        const d = event.data as { count: number };
        return `${event.displayName} is on a ${d.count}-answer streak!`;
      }
      case 'achievement': {
        const d = event.data as { name: string };
        return `${event.displayName} earned ${d.name}!`;
      }
      case 'level_up': {
        const d = event.data as { newLevel: number };
        return `${event.displayName} reached Level ${d.newLevel}!`;
      }
      default:
        return '';
    }
  });

  let icon = $derived(() => {
    switch (event.type) {
      case 'streak':
        return '🔥';
      case 'achievement':
        return '🏆';
      case 'level_up':
        return '⬆️';
      default:
        return '✨';
    }
  });

  let bgClass = $derived(() => {
    switch (event.type) {
      case 'streak':
        return 'from-orange-500/90 to-red-500/90';
      case 'achievement':
        return 'from-brand-500/90 to-brand-700/90';
      case 'level_up':
        return 'from-green-500/90 to-emerald-600/90';
      default:
        return 'from-brand-500/90 to-brand-700/90';
    }
  });
</script>

{#if visible}
  <div
    class="animate-slide-up rounded-xl bg-gradient-to-r {bgClass()} px-4 py-3 shadow-lg backdrop-blur-sm"
  >
    <div class="flex items-center gap-3">
      <span class="text-2xl animate-scale-in">{icon()}</span>
      <p class="text-sm font-semibold text-white">{message()}</p>
    </div>
  </div>
{/if}
