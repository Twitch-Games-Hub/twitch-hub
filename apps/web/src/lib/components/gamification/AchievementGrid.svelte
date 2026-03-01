<script lang="ts">
  interface Achievement {
    id: string;
    name: string;
    description: string;
    category: string;
    iconUrl?: string | null;
    earnedAt?: string;
  }

  let { earned } = $props<{
    earned: Achievement[];
  }>();

  const categoryIcons: Record<string, string> = {
    PARTICIPATION: '🏅',
    SKILL: '⚡',
    SOCIAL: '🤝',
    RARE: '✨',
  };
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
  {#each earned as achievement (achievement.id)}
    <div class="rounded-xl border border-border-default bg-surface-secondary p-3 animate-fade-in">
      <div class="mb-2 text-2xl">
        {categoryIcons[achievement.category] ?? '🏆'}
      </div>
      <p class="text-sm font-medium text-text-primary">{achievement.name}</p>
      <p class="mt-0.5 text-xs text-text-muted">{achievement.description}</p>
      {#if achievement.earnedAt}
        <p class="mt-1 text-xs text-text-muted">
          {new Date(achievement.earnedAt).toLocaleDateString()}
        </p>
      {/if}
    </div>
  {/each}

  {#if earned.length === 0}
    <div class="col-span-full py-8 text-center text-text-muted">
      <p class="text-lg">No achievements yet</p>
      <p class="text-sm">Play games to earn achievements!</p>
    </div>
  {/if}
</div>
