<script lang="ts">
  import {
    GameType,
    type HotTakeConfig,
    type BalanceConfig,
    type BlindTestConfig,
    type RankingConfig,
  } from '@twitch-hub/shared-types';
  import HotTakeEditor from './HotTakeEditor.svelte';
  import BalanceEditor from './BalanceEditor.svelte';
  import BlindTestEditor from './BlindTestEditor.svelte';
  import RankingEditor from './RankingEditor.svelte';

  let {
    gameType,
    config,
    onchange,
  }: {
    gameType: GameType;
    config: unknown;
    onchange: (config: unknown) => void;
  } = $props();
</script>

{#if gameType === GameType.HOT_TAKE}
  {@const c = config as HotTakeConfig}
  <HotTakeEditor statements={c.statements} roundDurationSec={c.roundDurationSec} {onchange} />
{:else if gameType === GameType.BALANCE}
  {@const c = config as BalanceConfig}
  <BalanceEditor questions={c.questions} roundDurationSec={c.roundDurationSec ?? 0} {onchange} />
{:else if gameType === GameType.BLIND_TEST}
  {@const c = config as BlindTestConfig}
  <BlindTestEditor rounds={c.rounds} answerWindowSec={c.answerWindowSec} {onchange} />
{:else if gameType === GameType.RANKING}
  {@const c = config as RankingConfig}
  <RankingEditor
    items={c.items}
    bracketSize={c.bracketSize}
    roundDurationSec={c.roundDurationSec}
    {onchange}
  />
{/if}
