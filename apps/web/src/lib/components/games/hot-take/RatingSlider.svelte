<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';

  let {
    value = $bindable(5),
    disabled = false,
    onsubmit,
  }: {
    value: number;
    disabled?: boolean;
    onsubmit?: (value: number) => void;
  } = $props();

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function handleSubmit() {
    vibrate(50);
    onsubmit?.(value);
  }

  function handleInput() {
    vibrate(10);
  }

  // Swipe-up-to-submit gesture
  let touchStartY = 0;
  let touchStartTime = 0;

  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function onTouchEnd(e: TouchEvent) {
    if (disabled) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;
    // Fast upward swipe: at least 60px up within 400ms
    if (deltaY < -60 && elapsed < 400) {
      handleSubmit();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="space-y-4 touch-pan-y" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <div class="flex items-center justify-between">
    <label for="rating-slider" class="text-sm text-text-secondary">Your Rating</label>
    <span class="text-3xl font-bold tabular-nums text-brand-400" aria-live="polite">
      {value}
    </span>
  </div>

  <div class="relative">
    <input
      id="rating-slider"
      type="range"
      min="1"
      max="10"
      step="1"
      bind:value
      oninput={handleInput}
      {disabled}
      aria-label="Rating from 1 to 10"
      aria-valuemin={1}
      aria-valuemax={10}
      aria-valuenow={value}
      class="rating-slider h-3 w-full cursor-pointer appearance-none rounded-lg bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
      style="touch-action: manipulation;"
    />
  </div>

  <div class="flex justify-between px-1 text-xs text-text-muted" aria-hidden="true">
    <span>Cold</span>
    <span>1</span>
    <span>2</span>
    <span>3</span>
    <span>4</span>
    <span>5</span>
    <span>6</span>
    <span>7</span>
    <span>8</span>
    <span>9</span>
    <span>10</span>
    <span>Hot</span>
  </div>

  <Button onclick={handleSubmit} {disabled} size="lg" class="w-full touch-manipulation">
    Submit Rating
  </Button>

  <p class="text-center text-xs text-text-muted">Swipe up to submit quickly</p>
</div>

<style>
  .rating-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #9146ff;
    cursor: pointer;
    border: 3px solid #efeff1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: transform 0.15s ease;
  }
  .rating-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  .rating-slider::-webkit-slider-thumb:active {
    transform: scale(1.05);
  }
  .rating-slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #9146ff;
    cursor: pointer;
    border: 3px solid #efeff1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
</style>
