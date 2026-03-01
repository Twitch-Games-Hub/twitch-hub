<script lang="ts">
  import type { RoundResults, RoundData } from '@twitch-hub/shared-types';

  let {
    gameType,
    roundResults,
    submittedAnswer,
    currentRound,
  }: {
    gameType: string;
    roundResults: RoundResults;
    submittedAnswer: unknown;
    currentRound: RoundData;
  } = $props();

  const outcome = $derived(computeOutcome());

  function computeOutcome(): {
    message: string;
    badge?: string;
    badgeClass?: string;
    answerReveal?: string;
    correct?: boolean;
  } | null {
    if (gameType === 'BLIND_TEST') {
      const correct =
        roundResults.correctAnswer !== undefined &&
        String(submittedAnswer).toLowerCase().trim() ===
          roundResults.correctAnswer.toLowerCase().trim();
      return {
        message: roundResults.correctAnswer ? `Answer: ${roundResults.correctAnswer}` : '',
        answerReveal: roundResults.correctAnswer,
        correct,
        badge: submittedAnswer !== undefined ? (correct ? '✓ Correct!' : '✗ Wrong') : undefined,
        badgeClass: correct
          ? 'bg-success-500/15 text-success-500'
          : 'bg-danger-500/15 text-danger-500',
      };
    }

    if (gameType === 'HOT_TAKE') {
      const distribution = roundResults.distribution;
      if (!distribution?.length) return null;
      const total = distribution.reduce((s, v) => s + v, 0);
      if (total === 0) return null;
      const avg = distribution.reduce((s, v, i) => s + v * (i + 1), 0) / total;
      const rating = Number(submittedAnswer);
      const peakBucket = distribution.indexOf(Math.max(...distribution));
      const withMajority = rating - 1 === peakBucket;
      return {
        message: `You rated ${rating} — average was ${avg.toFixed(1)}`,
        badge: withMajority ? 'With the majority!' : 'Against the majority',
        badgeClass: withMajority
          ? 'bg-success-500/15 text-success-500'
          : 'bg-surface-tertiary text-text-muted',
      };
    }

    if (gameType === 'BALANCE' || gameType === 'RANKING') {
      const [a, b] = roundResults.distribution ?? [0, 0];
      const winnerSide = a >= b ? 'A' : 'B';
      const won = submittedAnswer === winnerSide;
      return {
        message: won ? 'Your side won! 🎉' : 'Your side lost 😔',
        badge: undefined,
        badgeClass: undefined,
      };
    }

    return null;
  }
</script>

{#if outcome}
  <div
    class="animate-fade-in rounded-xl border border-border-subtle bg-surface-secondary px-4 py-3 text-center text-sm"
  >
    {#if outcome.answerReveal}
      <p class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">The answer</p>
      <p class="text-lg font-bold text-text-primary">{outcome.answerReveal}</p>
    {:else}
      <p class="font-medium text-text-primary">{outcome.message}</p>
    {/if}
    {#if outcome.badge}
      <span
        class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold {outcome.badgeClass}"
      >
        {outcome.badge}
      </span>
    {/if}
  </div>
{/if}
