<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

  let {
    onStartGame,
    onNextRound,
    onEndGame,
  }: {
    onStartGame: () => void;
    onNextRound: () => void;
    onEndGame: () => void;
  } = $props();

  let confirmEndOpen = $state(false);

  const status = $derived(gameStore.gameState?.status);
  const currentRound = $derived(gameStore.gameState?.currentRound ?? 0);
  const totalRounds = $derived(gameStore.gameState?.totalRounds ?? 0);
  const isLastRound = $derived(currentRound >= totalRounds);
</script>

<Card padding="md">
  {#if !status || status === 'LOBBY'}
    <div class="flex justify-center">
      <Button onclick={onStartGame} size="lg">Start Game</Button>
    </div>
  {:else if status === 'LIVE'}
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-text-muted">
          Round {currentRound} of {totalRounds}
        </span>
        {#if isLastRound}
          <Button onclick={() => (confirmEndOpen = true)}>Finish &amp; Show Results</Button>
        {:else}
          <Button onclick={onNextRound}>Next Round</Button>
        {/if}
      </div>

      {#if !isLastRound}
        <div class="border-t border-border-default"></div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-text-muted">End the game early</span>
          <Button onclick={() => (confirmEndOpen = true)} variant="danger-outline" size="sm">
            End Game
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</Card>

<ConfirmDialog
  bind:open={confirmEndOpen}
  title={isLastRound ? 'Finish Game?' : 'End Game?'}
  message={isLastRound
    ? 'This will end the final round and show results to all participants.'
    : 'This will end the game for all participants. This action cannot be undone.'}
  confirmLabel={isLastRound ? 'Finish & Show Results' : 'End Game'}
  onconfirm={onEndGame}
/>
