<script lang="ts">
  import { fade } from 'svelte/transition';
  import type {
    GamificationEvent,
    StreakEventData,
    AchievementEventData,
    LevelUpEventData,
  } from '@twitch-hub/shared-types';

  let { event, onDismiss }: { event: GamificationEvent; onDismiss: () => void } = $props();

  const message = $derived(
    event.type === 'streak'
      ? `${(event.data as StreakEventData).count}-answer streak! 🔥`
      : event.type === 'achievement'
        ? `Achievement unlocked: ${(event.data as AchievementEventData).name}!`
        : `Level up! You're now Level ${(event.data as LevelUpEventData).newLevel}!`,
  );

  const colorClasses = $derived(
    event.type === 'streak'
      ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
      : event.type === 'achievement'
        ? 'bg-brand-600/15 border-brand-500/40 text-brand-300'
        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  );

  let visible = $state(true);

  $effect(() => {
    const fadeTimer = setTimeout(() => {
      visible = false;
    }, 3000);
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  });
</script>

{#if visible}
  <div
    transition:fade={{ duration: 300 }}
    role="status"
    aria-live="polite"
    class="animate-slide-up rounded-xl border px-4 py-3 text-center text-sm font-semibold shadow-lg {colorClasses}"
  >
    {message}
  </div>
{/if}
