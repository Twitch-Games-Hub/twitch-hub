<script lang="ts">
  import type { SessionXpSummary } from '@twitch-hub/shared-types';

  let { summary }: { summary: SessionXpSummary } = $props();

  interface CategoryMeta {
    label: string;
    icon: string;
  }

  const CATEGORY_META: Record<string, CategoryMeta> = {
    ROUND_RESPONSE: { label: 'Round responses', icon: '🎯' },
    CORRECT_ANSWER: { label: 'Correct answers', icon: '✓' },
    SPEED_BONUS: { label: 'Speed bonus', icon: '⚡' },
    STREAK_BONUS: { label: 'Streak bonus', icon: '🔥' },
    FIRST_RESPONDER: { label: 'First responder', icon: '🏃' },
    MAJORITY_VOTER: { label: 'Majority voter', icon: '👥' },
  };

  const rows = $derived(
    Object.entries(summary.breakdown)
      .filter(([, xp]) => xp > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, xp]) => ({
        reason,
        xp,
        meta: CATEGORY_META[reason] ?? { label: reason, icon: '✨' },
      })),
  );
</script>

<div class="animate-scale-in rounded-xl border border-brand-600/30 bg-surface-elevated p-4">
  <div class="mb-4 text-center">
    <p class="text-xs font-medium uppercase tracking-widest text-text-muted">Your XP this game</p>
    <p class="mt-1 text-4xl font-black text-brand-400">+{summary.total}</p>
    <p class="text-xs text-text-muted">XP</p>
  </div>

  {#if rows.length > 0}
    <ul class="space-y-2 border-t border-border-subtle pt-3">
      {#each rows as row (row.reason)}
        <li class="flex items-center gap-2 text-sm">
          <span class="w-6 text-center text-base leading-none">{row.meta.icon}</span>
          <span class="flex-1 text-text-secondary">{row.meta.label}</span>
          <span class="font-semibold text-brand-400">+{row.xp}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
