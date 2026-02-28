<script lang="ts">
  import {
    GameType,
    type HotTakeConfig,
    type BalanceConfig,
    type BlindTestConfig,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import Card from '$lib/components/ui/Card.svelte';

  let {
    gameType,
    title,
    description,
    coverImageUrl,
    config,
  }: {
    gameType: GameType;
    title: string;
    description: string;
    coverImageUrl: string;
    config: unknown;
  } = $props();
</script>

<div class="space-y-6">
  <!-- Basic info -->
  <Card padding="md">
    <h2 class="mb-3 text-lg font-semibold text-text-primary">Game Details</h2>
    <dl class="space-y-2 text-sm">
      <div class="flex gap-2">
        <dt class="font-medium text-text-muted">Type:</dt>
        <dd class="text-text-primary">{GAME_TYPE_META[gameType]?.label}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="font-medium text-text-muted">Title:</dt>
        <dd class="text-text-primary">{title}</dd>
      </div>
      {#if description.trim()}
        <div class="flex gap-2">
          <dt class="font-medium text-text-muted">Description:</dt>
          <dd class="text-text-secondary">{description}</dd>
        </div>
      {/if}
      {#if coverImageUrl.trim()}
        <div>
          <dt class="mb-1 font-medium text-text-muted">Cover Image:</dt>
          <dd>
            <img
              src={coverImageUrl}
              alt="Cover preview"
              loading="lazy"
              class="h-24 w-auto rounded-lg object-contain"
              onerror={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </dd>
        </div>
      {/if}
    </dl>
  </Card>

  <!-- Game-specific config -->
  {#if gameType === GameType.HOT_TAKE}
    {@const c = config as HotTakeConfig}
    {#if c}
      <Card padding="md">
        <h2 class="mb-3 text-lg font-semibold text-text-primary">
          Statements ({c.statements.length})
        </h2>
        <ol class="list-inside list-decimal space-y-1 text-text-secondary">
          {#each c.statements as statement, i (i)}
            <li>{statement}</li>
          {/each}
        </ol>
      </Card>
    {/if}
  {:else if gameType === GameType.BALANCE}
    {@const c = config as BalanceConfig}
    {#if c?.questions}
      <Card padding="md">
        <h2 class="mb-3 text-lg font-semibold text-text-primary">
          Questions ({c.questions.length})
        </h2>
        <ol class="list-inside list-decimal space-y-2 text-text-secondary">
          {#each c.questions as q, i (i)}
            <li class="flex items-center gap-2 flex-wrap">
              {#if q.imageUrlA}
                <img
                  src={q.imageUrlA}
                  alt={q.optionA}
                  loading="lazy"
                  class="h-8 w-8 rounded object-cover inline-block"
                  onerror={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              {/if}
              {q.optionA} <span class="text-text-muted">vs</span>
              {#if q.imageUrlB}
                <img
                  src={q.imageUrlB}
                  alt={q.optionB}
                  loading="lazy"
                  class="h-8 w-8 rounded object-cover inline-block"
                  onerror={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              {/if}
              {q.optionB}
            </li>
          {/each}
        </ol>
      </Card>
    {/if}
  {:else if gameType === GameType.BLIND_TEST}
    {@const c = config as BlindTestConfig}
    {#if c?.rounds}
      <Card padding="md">
        <h2 class="mb-3 text-lg font-semibold text-text-primary">
          Rounds ({c.rounds.length}) — {c.answerWindowSec}s per round
        </h2>
        <ol class="list-inside list-decimal space-y-1 text-text-secondary">
          {#each c.rounds as round, i (i)}
            <li class="flex items-center gap-2">
              {#if round.imageUrl}
                <img
                  src={round.imageUrl}
                  alt={round.answer}
                  loading="lazy"
                  class="h-6 w-6 rounded object-cover"
                  onerror={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              {/if}
              {round.answer} ({round.hints.length} hint{round.hints.length !== 1 ? 's' : ''})
            </li>
          {/each}
        </ol>
      </Card>
    {/if}
  {/if}
</div>
