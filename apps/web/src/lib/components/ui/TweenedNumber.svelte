<script lang="ts">
  /**
   * Smoothly animates a numeric value using requestAnimationFrame.
   * Drop-in replacement for inline `{value}` wherever you want a count-up effect.
   */
  let {
    value,
    duration = 500,
    decimals = 0,
  }: { value: number; duration?: number; decimals?: number } = $props();

  let displayed = $state(value);
  let rafId: number | undefined;

  $effect(() => {
    const target = value;
    const start = displayed;
    if (start === target) return;

    const startTime = performance.now();
    if (rafId !== undefined) cancelAnimationFrame(rafId);

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      displayed = start + (target - start) * eased;
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        displayed = target;
        rafId = undefined;
      }
    }

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  });
</script>

{decimals === 0 ? Math.round(displayed) : displayed.toFixed(decimals)}
