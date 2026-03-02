<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { getPlaySocket, disconnectPlay } from '$lib/socket';
  import { gameStore } from '$lib/stores/game.svelte';
  import { XP_AWARDS } from '@twitch-hub/shared-types';
  import RatingSlider from '$lib/components/games/hot-take/RatingSlider.svelte';
  import BalanceChoice from '$lib/components/games/balance/BalanceChoice.svelte';
  import GuessInput from '$lib/components/games/blind-test/GuessInput.svelte';
  import RankingChoice from '$lib/components/games/ranking/RankingChoice.svelte';
  import PartialBracket from '$lib/components/games/ranking/PartialBracket.svelte';
  import Histogram from '$lib/components/overlay/Histogram.svelte';
  import TugOfWar from '$lib/components/overlay/TugOfWar.svelte';
  import { extractBinaryPercents } from '$lib/utils/votes';
  import Card from '$lib/components/ui/Card.svelte';
  import ConnectionIndicator from '$lib/components/ui/ConnectionIndicator.svelte';
  import CountdownTimer from '$lib/components/ui/CountdownTimer.svelte';
  import { LoaderIcon } from '$lib/components/ui/icons';
  import GamificationToast from '$lib/components/games/GamificationToast.svelte';
  import PostRoundOutcome from '$lib/components/games/PostRoundOutcome.svelte';
  import PlayerAvatarStrip from '$lib/components/games/PlayerAvatarStrip.svelte';
  import SessionLeaderboard from '$lib/components/games/SessionLeaderboard.svelte';
  import RoundCountdown from '$lib/components/games/RoundCountdown.svelte';
  import XpPopup from '$lib/components/games/XpPopup.svelte';
  import EmojiReactions from '$lib/components/games/EmojiReactions.svelte';
  import Confetti from '$lib/components/games/Confetti.svelte';
  import PersonalStatsSummary from '$lib/components/games/PersonalStatsSummary.svelte';
  import type { Socket } from 'socket.io-client';
  import type { FloatingEmoji } from '$lib/components/games/EmojiReactions.svelte';
  import type { XpPopupItem } from '$lib/components/games/XpPopup.svelte';

  let socket: Socket | null = null;
  let rating = $state(5);
  let pending = $state(false);
  let timeRemaining = $state(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let showCountdown = $state(false);
  let showConfetti = $state(false);
  let xpPopups = $state<XpPopupItem[]>([]);
  let floatingEmojis = $state<FloatingEmoji[]>([]);
  let popupIdCounter = 0;
  let emojiIdCounter = 0;

  const sessionId = $derived($page.params.sessionId!);
  const gameType = $derived(gameStore.gameState?.gameType);
  const questionId = $derived(gameStore.currentRound?.questionId);
  const submitted = $derived(questionId ? gameStore.isQuestionSubmitted(questionId) : false);

  function spawnXpPopup(text: string) {
    const id = ++popupIdCounter;
    xpPopups = [...xpPopups, { id, text }];
    setTimeout(() => {
      xpPopups = xpPopups.filter((p) => p.id !== id);
    }, 1500);
  }

  function spawnFloatingEmoji(emoji: string) {
    const id = ++emojiIdCounter;
    const x = Math.round((Math.random() - 0.5) * 160);
    floatingEmojis = [...floatingEmojis, { id, emoji, x }];
    setTimeout(() => {
      floatingEmojis = floatingEmojis.filter((e) => e.id !== id);
    }, 2200);
  }

  function sendReaction(emoji: string) {
    if (!socket || !sessionId) return;
    socket.emit('reaction:send', { sessionId, emoji });
    spawnFloatingEmoji(emoji);
  }

  onMount(async () => {
    let token: string | undefined;
    try {
      const res = await fetch('/api/auth/token');
      if (res.ok) {
        const data = await res.json();
        token = data.token;
      }
    } catch {
      // Not authenticated, continue anonymously
    }
    socket = getPlaySocket(token);
    gameStore.bindSocket(socket);
    if (sessionId) gameStore.joinSession(sessionId);

    socket.on('reaction:received', ({ emoji }: { emoji: string }) => {
      spawnFloatingEmoji(emoji);
    });
  });

  onDestroy(() => {
    disconnectPlay();
    if (timerInterval) clearInterval(timerInterval);
  });

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function submitRating(value: number) {
    if (!gameStore.currentRound || submitted || pending || !sessionId) return;
    vibrate(50);
    gameStore.submitResponse(sessionId, gameStore.currentRound.questionId, value);
    pending = true;
  }

  function submitAnswer(answer: unknown) {
    if (!gameStore.currentRound || submitted || pending || !sessionId) return;
    vibrate(50);
    gameStore.submitResponse(sessionId, gameStore.currentRound.questionId, answer);
    pending = true;
  }

  $effect(() => {
    if (submitted) {
      pending = false;
    }
  });

  // Spawn +XP popup when a new answer is acknowledged
  let prevSubmittedCount = 0;
  $effect(() => {
    const count = gameStore.submittedQuestionIds.length;
    if (count > prevSubmittedCount) {
      prevSubmittedCount = count;
      setTimeout(() => spawnXpPopup(`+${XP_AWARDS.ROUND_RESPONSE} XP`), 100);
    }
    if (count === 0) prevSubmittedCount = 0;
  });

  // Fire confetti when game ends
  $effect(() => {
    if (gameStore.finalResults && !showConfetti) {
      showConfetti = true;
    }
  });

  // Show 3-2-1 countdown on each new round
  let prevQuestionId = '';
  $effect(() => {
    const qid = gameStore.currentRound?.questionId ?? '';
    if (qid && qid !== prevQuestionId) {
      prevQuestionId = qid;
      showCountdown = true;
    }
  });

  $effect(() => {
    if (gameStore.currentRound) {
      pending = false;
      rating = 5;

      if (timerInterval) clearInterval(timerInterval);
      if (gameStore.currentRound.endsAt) {
        const updateTimer = () => {
          const remaining = Math.max(
            0,
            Math.ceil((new Date(gameStore.currentRound!.endsAt!).getTime() - Date.now()) / 1000),
          );
          timeRemaining = remaining;
          if (remaining <= 0 && timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        };
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
      }
    }
  });
</script>

<svelte:head>
  <title>Play - Twitch Hub</title>
</svelte:head>

<!-- Confetti burst on game over -->
{#if showConfetti}
  <Confetti onDone={() => (showConfetti = false)} />
{/if}

<!-- Round countdown overlay -->
{#if showCountdown && gameStore.currentRound}
  <RoundCountdown
    round={gameStore.gameState?.currentRound ?? 1}
    totalRounds={gameStore.gameState?.totalRounds ?? 1}
    onDone={() => (showCountdown = false)}
  />
{/if}

<!-- Floating +XP popups -->
<XpPopup popups={xpPopups} />

<div class="mx-auto max-w-lg overscroll-none px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
  <!-- Connection status -->
  <div class="mb-4 flex justify-end">
    <ConnectionIndicator connected={gameStore.connected} />
  </div>

  {#if !gameStore.connected}
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <LoaderIcon size={32} class="mb-4 text-brand-400" />
      <p class="text-text-secondary">Connecting to session...</p>
    </div>
  {:else if gameStore.finalResults}
    <div class="animate-fade-in text-center">
      <h1
        class="mb-2 bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-4xl font-bold text-transparent"
      >
        Game Over!
      </h1>
      <p class="mb-6 text-text-secondary">
        Thanks for playing! {gameStore.finalResults.totalParticipants} participants joined.
      </p>

      {#if gameStore.sessionSummary}
        <div class="mb-6 text-left">
          <PersonalStatsSummary summary={gameStore.sessionSummary} />
        </div>
      {/if}
      {#if gameStore.finalResults.ranking}
        {@const ranking = gameStore.finalResults.ranking}
        <Card padding="lg" class="mb-4">
          <div class="text-center">
            {#if ranking.champion.imageUrl}
              <img
                src={ranking.champion.imageUrl}
                alt={ranking.champion.name}
                class="mx-auto mb-3 h-20 w-20 rounded-xl object-cover"
              />
            {/if}
            <h3 class="text-2xl font-bold text-brand-400">{ranking.champion.name}</h3>
            <p class="text-sm text-text-muted">Champion</p>
          </div>
          {#if ranking.rankings.length > 1}
            <ol class="mt-4 space-y-1">
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
                      class="h-6 w-6 rounded object-cover"
                    />
                  {/if}
                  {entry.item.name}
                </li>
              {/each}
            </ol>
          {/if}
        </Card>
      {:else}
        {#each gameStore.finalResults.rounds as round (round.round)}
          <Card padding="md" class="mb-4 text-left">
            <p class="mb-2 text-sm text-text-muted">Round {round.round}</p>
            {#if (gameType === 'BALANCE' || gameType === 'RANKING') && extractBinaryPercents(round)}
              {@const split = extractBinaryPercents(round)!}
              <TugOfWar
                percentA={split.percentA}
                percentB={split.percentB}
                labelA="A"
                labelB="B"
                totalVotes={split.totalVotes}
              />
            {:else if round.distribution}
              <Histogram
                distribution={round.distribution}
                totalVotes={round.totalResponses}
                compact
              />
            {/if}
          </Card>
        {/each}
      {/if}
      {#if gameStore.leaderboard.length > 0}
        <SessionLeaderboard entries={gameStore.leaderboard} users={gameStore.connectedUsers} />
      {/if}
    </div>
  {:else if gameStore.currentRound}
    <div class="animate-slide-up space-y-6">
      <div class="text-center">
        <p class="text-sm text-text-muted">
          Round {gameStore.gameState?.currentRound}/{gameStore.gameState?.totalRounds}
          {#if gameStore.currentRound?.endsAt}
            <span class="ml-2">
              <CountdownTimer endsAt={gameStore.currentRound.endsAt} compact />
            </span>
          {/if}
        </p>
        <h2 class="mt-2 text-2xl font-bold text-text-primary">{gameStore.currentRound.prompt}</h2>
      </div>

      {#if gameStore.connectedUsers.length > 0}
        <PlayerAvatarStrip
          users={gameStore.connectedUsers}
          totalCount={gameStore.participantCount}
        />
      {/if}

      {#if gameStore.roundResults}
        <Card padding="lg" class="animate-fade-in text-center">
          <h3 class="mb-3 text-lg font-semibold text-brand-400">Results</h3>
          {#if (gameType === 'BALANCE' || gameType === 'RANKING') && extractBinaryPercents(gameStore.roundResults)}
            {@const split = extractBinaryPercents(gameStore.roundResults)!}
            <TugOfWar
              percentA={split.percentA}
              percentB={split.percentB}
              labelA={gameStore.currentRound?.options?.[0] ?? 'A'}
              labelB={gameStore.currentRound?.options?.[1] ?? 'B'}
              totalVotes={split.totalVotes}
            />
          {:else if gameStore.roundResults.distribution}
            <Histogram
              distribution={gameStore.roundResults.distribution}
              totalVotes={gameStore.roundResults.totalResponses}
              compact
            />
          {/if}
        </Card>
        {@const myAnswer = gameStore.submittedAnswers[gameStore.currentRound?.questionId ?? '']}
        {#if gameType && gameStore.currentRound && (myAnswer !== undefined || gameStore.roundResults.correctAnswer)}
          <PostRoundOutcome
            {gameType}
            roundResults={gameStore.roundResults}
            submittedAnswer={myAnswer}
          />
        {/if}
        {#if gameStore.leaderboard.length > 0}
          <SessionLeaderboard entries={gameStore.leaderboard} users={gameStore.connectedUsers} />
        {/if}
      {:else if submitted || pending}
        <Card padding="lg" class="animate-fade-in text-center">
          <div class="flex items-center justify-center gap-2 text-success-500">
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>Response submitted! Waiting for results...</p>
          </div>
          {#if gameType === 'RANKING' && gameStore.completedMatchups.length > 0}
            <div class="mt-4 border-t border-border-subtle pt-4">
              <PartialBracket
                matchups={gameStore.completedMatchups}
                bracketSize={gameStore.currentRound?.meta?.bracketSize as number}
                currentMatchupMeta={gameStore.currentRound?.meta
                  ? {
                      bracketLevel: gameStore.currentRound.meta.bracketLevel as number,
                      matchupIndex: gameStore.currentRound.meta.matchupIndex as number,
                      levelName: gameStore.currentRound.meta.levelName as string | undefined,
                    }
                  : null}
              />
            </div>
          {/if}
        </Card>
      {:else if gameType === 'HOT_TAKE'}
        <Card padding="lg">
          <RatingSlider bind:value={rating} onsubmit={submitRating} />
        </Card>
      {:else if gameType === 'BALANCE'}
        <Card padding="lg" class="touch-manipulation">
          <BalanceChoice
            optionA={gameStore.currentRound?.options?.[0] ?? 'A'}
            optionB={gameStore.currentRound?.options?.[1] ?? 'B'}
            imageUrlA={gameStore.currentRound?.optionImages?.[0]}
            imageUrlB={gameStore.currentRound?.optionImages?.[1]}
            onsubmit={(choice: string) => submitAnswer(choice)}
          />
        </Card>
      {:else if gameType === 'BLIND_TEST'}
        <Card padding="lg">
          <GuessInput
            {timeRemaining}
            disabled={false}
            imageUrl={gameStore.currentRound?.optionImages?.[0]}
            onsubmit={(guess: string) => submitAnswer(guess)}
          />
        </Card>
      {:else if gameType === 'RANKING'}
        <Card padding="lg" class="touch-manipulation">
          <RankingChoice
            optionA={gameStore.currentRound?.options?.[0] ?? 'A'}
            optionB={gameStore.currentRound?.options?.[1] ?? 'B'}
            imageUrlA={gameStore.currentRound?.optionImages?.[0]}
            imageUrlB={gameStore.currentRound?.optionImages?.[1]}
            levelName={gameStore.currentRound?.meta?.levelName as string | undefined}
            onsubmit={(choice: string) => submitAnswer(choice)}
          />
        </Card>
      {/if}

      <!-- Emoji reaction bar -->
      <EmojiReactions onReact={sendReaction} {floatingEmojis} />

      <div class="text-center text-sm text-text-muted" role="status" aria-live="polite">
        {gameStore.participantCount} participants
      </div>
    </div>
  {:else if gameStore.gameState?.status === 'LOBBY'}
    <div class="animate-fade-in py-12 text-center">
      <div class="mb-6">
        <div class="mx-auto h-16 w-16 animate-pulse rounded-full bg-brand-600/20"></div>
      </div>
      <h1 class="mb-3 text-2xl font-bold text-text-primary">Waiting for game to start...</h1>
      <p class="text-text-secondary">The streamer will start the game soon.</p>
      <div class="mt-6 tabular-nums text-sm text-text-muted" role="status" aria-live="polite">
        {gameStore.participantCount} participants waiting
      </div>
      {#if gameStore.connectedUsers.length > 0}
        <div class="mt-4 flex justify-center">
          <PlayerAvatarStrip
            users={gameStore.connectedUsers}
            totalCount={gameStore.participantCount}
          />
        </div>
      {/if}
    </div>
  {:else if gameStore.error}
    <div class="animate-fade-in py-12 text-center">
      <div
        class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger-500/10"
      >
        <svg
          class="h-8 w-8 text-danger-500"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h1 class="mb-3 text-2xl font-bold text-text-primary">{gameStore.error}</h1>
      <p class="text-text-secondary">This session is no longer available.</p>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <LoaderIcon size={32} class="mb-4 text-brand-400" />
      <h1 class="mb-2 text-2xl font-bold text-text-primary">Joining session...</h1>
      <p class="text-text-secondary">Connecting to the game session.</p>
    </div>
  {/if}
</div>

<!-- Fixed toast container, bottom-center, above system toasts -->
<div class="fixed bottom-20 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 px-4">
  {#if gameStore.gamificationQueue.length > 0}
    <GamificationToast
      event={gameStore.gamificationQueue[0]}
      onDismiss={() => gameStore.dequeueGamificationEvent()}
    />
  {/if}
</div>
