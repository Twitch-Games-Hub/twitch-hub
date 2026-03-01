<script lang="ts">
  import type {
    FinalResults,
    ApiGameBase,
    HotTakeConfig,
    BalanceConfig,
    BlindTestConfig,
  } from '@twitch-hub/shared-types';
  import Card from '$lib/components/ui/Card.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import TugOfWar from '$lib/components/overlay/TugOfWar.svelte';
  import BracketViz from '$lib/components/overlay/BracketViz.svelte';
  import { extractBinaryPercents } from '$lib/utils/votes';
  import Leaderboard from '$lib/components/overlay/Leaderboard.svelte';

  let {
    finalResults,
    game,
  }: {
    finalResults: FinalResults;
    game: ApiGameBase;
  } = $props();

  const totalResponses = $derived(
    finalResults.rounds.reduce((sum, r) => sum + r.totalResponses, 0),
  );

  function getRoundLabel(index: number): string {
    const config = game.config as Record<string, unknown>;
    switch (game.type) {
      case 'HOT_TAKE': {
        const htConfig = config as unknown as HotTakeConfig;
        return htConfig.statements?.[index] ?? `Round ${index + 1}`;
      }
      case 'BALANCE': {
        const bConfig = config as unknown as BalanceConfig;
        const q = bConfig.questions?.[index];
        return q ? `${q.optionA} vs ${q.optionB}` : `Round ${index + 1}`;
      }
      case 'BLIND_TEST': {
        const btConfig = config as unknown as BlindTestConfig;
        return btConfig.rounds?.[index]?.answer
          ? `Answer: ${btConfig.rounds[index].answer}`
          : `Round ${index + 1}`;
      }
      case 'RANKING': {
        const matchup = finalResults.ranking?.matchups?.[index];
        return matchup ? `${matchup.itemA.name} vs ${matchup.itemB.name}` : `Matchup ${index + 1}`;
      }
      default:
        return `Round ${index + 1}`;
    }
  }

  function getBalanceLabels(index: number): { labelA: string; labelB: string } {
    const bConfig = game.config as unknown as BalanceConfig;
    const q = bConfig.questions?.[index];
    return {
      labelA: q?.optionA ?? 'A',
      labelB: q?.optionB ?? 'B',
    };
  }

  function getLeaderboardEntries(
    percentages: Record<string, number>,
  ): { userId: string; score: number }[] {
    return Object.entries(percentages)
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
  }
</script>

<!-- Ranking Champion -->
{#if finalResults.ranking}
  {@const ranking = finalResults.ranking}
  <Card padding="lg">
    <div class="text-center mb-4">
      {#if ranking.champion.imageUrl}
        <img
          src={ranking.champion.imageUrl}
          alt={ranking.champion.name}
          class="mx-auto mb-3 h-16 w-16 rounded-xl object-cover"
        />
      {/if}
      <h3 class="text-xl font-bold text-brand-400">{ranking.champion.name}</h3>
      <p class="text-xs text-text-muted">Champion</p>
    </div>
    {#if ranking.rankings.length > 1}
      <ol class="space-y-1 mb-4">
        {#each ranking.rankings as entry (entry.item.id)}
          <li class="flex items-center gap-2 text-sm text-text-secondary">
            <span
              class="w-6 text-right font-bold {entry.rank === 1
                ? 'text-brand-400'
                : 'text-text-muted'}">{entry.rank}</span
            >
            {#if entry.item.imageUrl}
              <img
                src={entry.item.imageUrl}
                alt={entry.item.name}
                class="h-5 w-5 rounded object-cover"
              />
            {/if}
            {entry.item.name}
          </li>
        {/each}
      </ol>
    {/if}
    <BracketViz
      matchups={ranking.matchups}
      bracketSize={ranking.bracketSize}
      champion={ranking.champion}
    />
  </Card>
{/if}

<!-- Summary -->
<Card padding="md">
  <div class="grid grid-cols-3 gap-4 text-center">
    <div>
      <p class="text-2xl font-bold text-brand-400">{finalResults.totalParticipants}</p>
      <p class="text-xs text-text-muted">Participants</p>
    </div>
    <div>
      <p class="text-2xl font-bold text-brand-400">{finalResults.rounds.length}</p>
      <p class="text-xs text-text-muted">Rounds</p>
    </div>
    <div>
      <p class="text-2xl font-bold text-brand-400">{totalResponses}</p>
      <p class="text-xs text-text-muted">Total Responses</p>
    </div>
  </div>
</Card>

<!-- Round-by-round results -->
{#each finalResults.rounds as round, i (round.round)}
  <Card padding="md">
    <p class="mb-3 text-sm font-medium text-text-secondary">{getRoundLabel(i)}</p>

    {#if game.type === 'HOT_TAKE' && round.distribution}
      <Histogram distribution={round.distribution} totalVotes={round.totalResponses} compact />
    {:else if game.type === 'BALANCE' && extractBinaryPercents(round)}
      {@const labels = getBalanceLabels(i)}
      {@const split = extractBinaryPercents(round)!}
      <TugOfWar
        percentA={split.percentA}
        percentB={split.percentB}
        labelA={labels.labelA}
        labelB={labels.labelB}
        totalVotes={split.totalVotes}
      />
    {:else if game.type === 'RANKING' && extractBinaryPercents(round)}
      {@const split = extractBinaryPercents(round)!}
      {@const matchup = finalResults.ranking?.matchups?.[i]}
      <TugOfWar
        percentA={split.percentA}
        percentB={split.percentB}
        labelA={matchup?.itemA.name ?? 'A'}
        labelB={matchup?.itemB.name ?? 'B'}
        totalVotes={split.totalVotes}
      />
    {:else if game.type === 'BLIND_TEST' && round.percentages}
      <Leaderboard entries={getLeaderboardEntries(round.percentages)} title="Leaderboard" />
    {:else if round.distribution}
      <Histogram distribution={round.distribution} totalVotes={round.totalResponses} compact />
    {:else}
      <p class="text-sm text-text-muted">{round.totalResponses} responses</p>
    {/if}
  </Card>
{/each}
