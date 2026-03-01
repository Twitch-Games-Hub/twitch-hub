<script lang="ts">
  let { round, totalRounds, onDone }: { round: number; totalRounds: number; onDone: () => void } =
    $props();

  const STEPS = ['3', '2', '1', 'GO!'];
  let stepIndex = $state(0);
  let key = $state(0); // bump to re-trigger animation

  $effect(() => {
    // Reset on mount / round change
    stepIndex = 0;
    key = 0;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Each step lasts 900ms (matches countdown-ping animation)
    for (let i = 1; i < STEPS.length; i++) {
      timers.push(
        setTimeout(() => {
          stepIndex = i;
          key = i;
        }, i * 900),
      );
    }

    // Fire done after all steps (last step GO! shows for 700ms before hiding)
    timers.push(setTimeout(onDone, STEPS.length * 900));

    return () => timers.forEach(clearTimeout);
  });

  const isGo = $derived(stepIndex === STEPS.length - 1);
</script>

<div
  class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-surface-primary/80 backdrop-blur-sm"
  aria-live="assertive"
  aria-atomic="true"
>
  <p class="mb-6 text-sm font-medium text-text-muted">
    Round {round} / {totalRounds}
  </p>

  {#key key}
    <span
      class="animate-countdown-ping block select-none font-black leading-none {isGo
        ? 'text-7xl text-brand-400'
        : 'text-9xl text-text-primary'}"
    >
      {STEPS[stepIndex]}
    </span>
  {/key}
</div>
