<script lang="ts">
  let {
    level,
    currentXp,
    xpNeededForNext,
    xpInCurrentLevel,
    compact = false,
  } = $props<{
    level: number;
    currentXp: number;
    xpNeededForNext: number;
    xpInCurrentLevel: number;
    compact?: boolean;
  }>();

  let progress = $derived(
    xpNeededForNext > 0 ? Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100) : 100,
  );
</script>

{#if compact}
  <div class="flex items-center gap-2">
    <span class="text-xs font-bold text-brand-400">Lv.{level}</span>
    <div class="h-1.5 w-16 rounded-full bg-surface-elevated overflow-hidden">
      <div
        class="h-full rounded-full bg-brand-500 transition-all duration-500"
        style="width: {progress}%"
      ></div>
    </div>
  </div>
{:else}
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="rounded-lg bg-brand-500/20 px-2.5 py-1 text-sm font-bold text-brand-400">
          Level {level}
        </span>
        <span class="text-sm text-text-muted">{currentXp.toLocaleString()} XP</span>
      </div>
      <span class="text-xs text-text-muted">
        {xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
      </span>
    </div>
    <div class="h-3 w-full rounded-full bg-surface-elevated overflow-hidden">
      <div
        class="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700 animate-bar-grow"
        style="width: {progress}%; transform-origin: left"
      ></div>
    </div>
  </div>
{/if}
