<script lang="ts">
  import { GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';

  let {
    selected,
    onselect,
  }: {
    selected: GameType;
    onselect: (type: GameType) => void;
  } = $props();

  const allTypes = Object.values(GameType).map((value) => ({
    value,
    ...GAME_TYPE_META[value],
  }));
</script>

<div class="grid gap-3 sm:grid-cols-2">
  {#each allTypes as type (type.value)}
    {@const isAvailable = type.available}
    <button
      type="button"
      onclick={() => isAvailable && onselect(type.value)}
      disabled={!isAvailable}
      class="relative rounded-lg border p-3 text-left transition-colors {selected === type.value
        ? 'border-brand-400 bg-brand-600/10'
        : isAvailable
          ? 'border-border-default bg-surface-tertiary hover:border-border-default/80'
          : 'cursor-not-allowed border-border-subtle bg-surface-tertiary opacity-50'}"
    >
      <div class="font-medium text-text-primary">{type.label}</div>
      <div class="text-xs text-text-muted">{type.description}</div>
      {#if !isAvailable}
        <span
          class="absolute right-2 top-2 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted"
        >
          Coming Soon
        </span>
      {/if}
    </button>
  {/each}
</div>
