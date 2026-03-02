<script lang="ts">
  /**
   * Smoothly animates a numeric value using Svelte's built-in Tween.
   * Drop-in replacement for inline `{value}` wherever you want a count-up effect.
   */
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  let {
    value,
    duration = 500,
    decimals = 0,
  }: { value: number; duration?: number; decimals?: number } = $props();

  // svelte-ignore state_referenced_locally
  const tween = Tween.of(() => value, { duration, easing: cubicOut });
</script>

{decimals === 0 ? Math.round(tween.current) : tween.current.toFixed(decimals)}
