<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { getOverlaySocket } from '$lib/socket';
  import { gameStore } from '$lib/stores/game.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import TugOfWar from '$lib/components/overlay/TugOfWar.svelte';
  import { countsToPercents, extractBinaryPercents } from '$lib/utils/votes';
  import Leaderboard from '$lib/components/overlay/Leaderboard.svelte';
  import OverlayHud from '$lib/components/overlay/OverlayHud.svelte';
  import RoundSplash from '$lib/components/overlay/RoundSplash.svelte';
  import GameOverResults from '$lib/components/overlay/GameOverResults.svelte';
  import AmbientParticles from '$lib/components/overlay/AmbientParticles.svelte';
  import { GAME_TYPE_META } from '$lib/constants';
  import type { Socket } from 'socket.io-client';

  let socket: Socket | null = null;

  const sessionId = $derived($page.params.sessionId!);
  const gameType = $derived(gameStore.gameState?.gameType);
  const gameTitle = $derived(gameStore.gameState?.gameTitle ?? '');
  const coverImageUrl = $derived(gameStore.gameState?.coverImageUrl);

  // Round splash state
  let showRoundSplash = $state(false);
  let splashRoundNumber = $state(0);
  let prevRound = $state(0);

  // Detect round transitions for splash
  $effect(() => {
    const current = gameStore.gameState?.currentRound ?? 0;
    if (current > prevRound && prevRound > 0) {
      // Not the first round — show splash
      splashRoundNumber = current;
      showRoundSplash = true;
    }
    prevRound = current;
  });

  function onSplashDone() {
    showRoundSplash = false;
  }

  // Derive overlay phase
  type OverlayPhase = 'lobby' | 'splash' | 'live' | 'round-results' | 'game-over';

  const phase: OverlayPhase = $derived.by(() => {
    if (gameStore.finalResults) return 'game-over';
    if (showRoundSplash) return 'splash';
    if (gameStore.roundResults) return 'round-results';
    if (gameStore.currentRound) return 'live';
    return 'lobby';
  });

  const typeMeta = $derived(gameType ? GAME_TYPE_META[gameType] : null);

  onMount(() => {
    socket = getOverlaySocket();
    gameStore.bindSocket(socket);
    if (sessionId) gameStore.joinSession(sessionId);
  });

  onDestroy(() => {
    socket?.disconnect();
  });
</script>

<svelte:head>
  <title>Overlay</title>
  <style>
    html,
    body {
      background: transparent !important;
      overflow: hidden;
    }
  </style>
</svelte:head>

<div class="overlay-container fixed inset-0 flex flex-col">
  <!-- Ambient particles (visible during live + round-results) -->
  {#if phase === 'live' || phase === 'round-results'}
    <AmbientParticles />
  {/if}

  <!-- HUD (top bar, visible during live + round-results phases) -->
  {#if (phase === 'live' || phase === 'round-results') && gameType}
    <OverlayHud
      {gameTitle}
      {gameType}
      currentRound={gameStore.gameState?.currentRound ?? 0}
      totalRounds={gameStore.gameState?.totalRounds ?? 0}
      participantCount={gameStore.participantCount}
      endsAt={gameStore.currentRound?.endsAt}
    />
  {/if}

  <!-- Main content area -->
  <div class="flex flex-1 items-end justify-center p-8">
    {#key phase}
      {#if phase === 'lobby'}
        <!-- Rich lobby -->
        <div
          class="w-full max-w-md"
          in:fly={{ y: 30, duration: 400, delay: 250 }}
          out:fade={{ duration: 200 }}
        >
          <div class="rounded-2xl bg-black/70 p-6 text-center backdrop-blur-sm">
            {#if coverImageUrl}
              <img
                src={coverImageUrl}
                alt={gameTitle}
                class="mx-auto mb-4 h-24 w-24 rounded-xl object-cover"
              />
            {/if}
            {#if gameTitle}
              <h2 class="text-2xl font-bold text-white">{gameTitle}</h2>
            {:else}
              <h2 class="text-2xl font-bold text-white">Starting Soon...</h2>
            {/if}
            {#if typeMeta}
              <span
                class="mt-2 inline-block rounded-full border border-brand-400/30 bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-300"
              >
                {typeMeta.label}
              </span>
            {/if}
            <div class="mt-3 flex items-center justify-center gap-2">
              <div class="h-2 w-2 animate-pulse rounded-full bg-success-500"></div>
              <p class="tabular-nums text-text-muted" role="status" aria-live="polite">
                {gameStore.participantCount} waiting
              </p>
            </div>
          </div>
        </div>
      {:else if phase === 'splash'}
        <!-- Round interstitial -->
        <div in:fly={{ y: 30, duration: 400, delay: 250 }} out:fade={{ duration: 200 }}>
          <RoundSplash
            roundNumber={splashRoundNumber}
            totalRounds={gameStore.gameState?.totalRounds ?? 0}
            onDone={onSplashDone}
          />
        </div>
      {:else if phase === 'live' && gameStore.currentRound}
        <!-- Live gameplay -->
        <div
          class="w-full max-w-2xl"
          in:fly={{ y: 30, duration: 400, delay: 250 }}
          out:fade={{ duration: 200 }}
        >
          <!-- Prompt card -->
          <div class="mb-4 text-center">
            <div class="inline-block rounded-2xl bg-black/70 px-8 py-4 backdrop-blur-sm">
              <h2 class="text-2xl font-bold text-white">{gameStore.currentRound.prompt}</h2>
            </div>
          </div>

          <!-- Live vote visualization -->
          {#if gameStore.votes}
            <div class="animate-fade-in rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
              {#if gameStore.votes.distribution.length === 2 && (gameType === 'BALANCE' || gameType === 'RANKING')}
                {@const [pA, pB] = countsToPercents(
                  gameStore.votes.distribution[0],
                  gameStore.votes.distribution[1],
                )}
                <TugOfWar
                  percentA={pA}
                  percentB={pB}
                  labelA={gameStore.currentRound?.options?.[0] ?? 'A'}
                  labelB={gameStore.currentRound?.options?.[1] ?? 'B'}
                  totalVotes={gameStore.votes.totalVotes}
                  imageA={gameStore.currentRound?.optionImages?.[0]}
                  imageB={gameStore.currentRound?.optionImages?.[1]}
                />
              {:else}
                <Histogram
                  distribution={gameStore.votes.distribution}
                  totalVotes={gameStore.votes.totalVotes}
                />
              {/if}
            </div>
          {/if}
        </div>
      {:else if phase === 'round-results' && gameStore.roundResults}
        <!-- Round results -->
        <div
          class="w-full max-w-2xl"
          in:fly={{ y: 30, duration: 400, delay: 250 }}
          out:fade={{ duration: 200 }}
        >
          <div class="rounded-2xl bg-black/70 p-6 backdrop-blur-sm">
            <h3 class="mb-4 text-center text-xl font-bold text-brand-400">Round Results</h3>
            {#if gameType === 'BLIND_TEST' && gameStore.roundResults.percentages}
              <Leaderboard
                entries={Object.entries(gameStore.roundResults.percentages).map(
                  ([userId, score]) => ({
                    userId,
                    score,
                  }),
                )}
                title="Leaderboard"
              />
            {:else if (gameType === 'BALANCE' || gameType === 'RANKING') && extractBinaryPercents(gameStore.roundResults)}
              {@const split = extractBinaryPercents(gameStore.roundResults)!}
              <TugOfWar
                percentA={split.percentA}
                percentB={split.percentB}
                labelA="A"
                labelB="B"
                totalVotes={split.totalVotes}
              />
            {:else if gameStore.roundResults.distribution}
              <Histogram
                distribution={gameStore.roundResults.distribution}
                totalVotes={gameStore.roundResults.totalResponses}
              />
            {/if}
          </div>
        </div>
      {:else if phase === 'game-over' && gameStore.finalResults && gameType}
        <!-- Game over with type-specific results -->
        <div in:fly={{ y: 30, duration: 400, delay: 250 }} out:fade={{ duration: 200 }}>
          <GameOverResults {gameType} finalResults={gameStore.finalResults} {gameTitle} />
        </div>
      {/if}
    {/key}
  </div>
</div>

<style>
  .overlay-container {
    font-family: 'Inter', system-ui, sans-serif;
  }
</style>
