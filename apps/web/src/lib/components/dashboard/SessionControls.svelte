<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import Button from '$lib/components/ui/Button.svelte';
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
</script>

<div class="flex flex-wrap gap-3">
  {#if !status || status === 'WAITING'}
    <Button onclick={onStartGame} size="lg">Start Game</Button>
  {:else if status === 'ACTIVE'}
    <Button onclick={onNextRound} variant="secondary">Next Round</Button>
    <Button onclick={() => (confirmEndOpen = true)} variant="danger">End Game</Button>
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmEndOpen}
  title="End Game?"
  message="This will end the game for all participants. This action cannot be undone."
  confirmLabel="End Game"
  onconfirm={onEndGame}
/>
