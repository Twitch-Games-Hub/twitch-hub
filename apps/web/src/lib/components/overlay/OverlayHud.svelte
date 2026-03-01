<script lang="ts">
  import type { GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import CountdownTimer from '$lib/components/ui/CountdownTimer.svelte';

  let {
    gameTitle,
    gameType,
    currentRound,
    totalRounds,
    participantCount,
    endsAt,
  }: {
    gameTitle: string;
    gameType: GameType;
    currentRound: number;
    totalRounds: number;
    participantCount: number;
    endsAt?: string;
  } = $props();

  const typeMeta = $derived(GAME_TYPE_META[gameType]);
</script>

<div class="animate-slide-down fixed top-0 right-0 left-0 z-50 bg-black/70 backdrop-blur-sm">
  <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
    <!-- Game title -->
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-lg font-bold text-white">{gameTitle}</h1>
    </div>

    <!-- Game type pill -->
    <div class="mx-4 shrink-0">
      <span
        class="rounded-full border border-brand-400/30 bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-300"
      >
        {typeMeta?.label ?? gameType}
      </span>
    </div>

    <!-- Round / countdown / participants -->
    <div class="flex shrink-0 items-center gap-4 text-sm">
      <span class="tabular-nums text-text-secondary">
        Round {currentRound}/{totalRounds}
      </span>

      {#if endsAt}
        <span class="tabular-nums text-brand-400">
          <CountdownTimer {endsAt} compact />
        </span>
      {/if}

      <span class="rounded-full bg-brand-600/30 px-3 py-0.5 tabular-nums text-white">
        {participantCount}
      </span>
    </div>
  </div>
</div>
