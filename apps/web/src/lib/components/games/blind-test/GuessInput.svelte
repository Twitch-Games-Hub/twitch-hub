<script lang="ts">
  interface Props {
    disabled: boolean;
    timeRemaining: number;
    imageUrl?: string | null;
    onsubmit: (guess: string) => void;
  }

  let { disabled, timeRemaining, imageUrl, onsubmit }: Props = $props();

  let inputValue = $state('');

  function handleSubmit() {
    if (inputValue.trim() && !disabled) {
      onsubmit(inputValue.trim());
      inputValue = '';
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  function getTimerColor() {
    return timeRemaining < 5 ? 'text-danger-500' : 'text-brand-400';
  }

  function getTimerBgColor() {
    return timeRemaining < 5 ? 'bg-danger-900' : 'bg-surface-secondary';
  }
</script>

<div class="space-y-4">
  {#if imageUrl}
    <div class="flex justify-center">
      <img
        src={imageUrl}
        alt="Image clue"
        loading="lazy"
        class="max-h-48 w-auto mx-auto rounded-lg"
        onerror={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  {/if}

  <div class="text-center">
    <div class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
      Time Remaining
    </div>
    <div class={`text-5xl font-bold font-mono ${getTimerColor()} transition-colors duration-200`}>
      {timeRemaining}s
    </div>
  </div>

  <div class={`rounded-lg p-4 ${getTimerBgColor()} transition-colors duration-200`}>
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={inputValue}
        onkeydown={handleKeyDown}
        {disabled}
        placeholder="Enter your guess..."
        class="flex-1 bg-surface-tertiary text-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2
				       focus:ring-brand-500 disabled:bg-surface-elevated disabled:cursor-not-allowed
				       placeholder-text-muted"
      />
      <button
        onclick={handleSubmit}
        disabled={disabled || !inputValue.trim()}
        class="bg-brand-600 hover:bg-brand-500 disabled:bg-surface-elevated disabled:cursor-not-allowed
				       text-text-primary px-6 py-3 rounded-lg font-semibold transition-colors duration-200
				       border-2 border-brand-500 hover:border-brand-400 disabled:border-border-default"
      >
        Submit
      </button>
    </div>
  </div>

  <div class="text-xs text-text-muted text-center">Press Enter or click Submit to guess</div>
</div>
