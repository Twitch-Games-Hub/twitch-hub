<script lang="ts">
  import { CheckIcon } from '$lib/components/ui/icons';

  let {
    optionA,
    optionB,
    imageUrlA,
    imageUrlB,
    levelName,
    disabled = false,
    onsubmit,
  }: {
    optionA: string;
    optionB: string;
    imageUrlA?: string | null;
    imageUrlB?: string | null;
    levelName?: string;
    disabled?: boolean;
    onsubmit: (choice: string) => void;
  } = $props();

  let selected = $state<'A' | 'B' | null>(null);

  function choose(choice: 'A' | 'B') {
    if (disabled || selected) return;
    selected = choice;
    onsubmit(choice);
  }
</script>

<div class="space-y-3">
  {#if levelName}
    <div class="text-center">
      <span
        class="inline-block rounded-full bg-brand-600/20 px-4 py-1 text-sm font-semibold text-brand-400"
      >
        {levelName}
      </span>
    </div>
  {/if}

  <div
    class="ranking-container flex flex-col sm:flex-row gap-4 w-full h-full p-4 sm:p-8 items-stretch"
  >
    <!-- Option A Button -->
    <button
      class="option-btn flex-1 relative rounded-xl font-bold text-text-primary transition-all duration-300 shadow-lg overflow-hidden
        {selected === 'A' ? 'ring-4 ring-brand-400 scale-[1.02]' : ''}
        {selected === 'B' ? 'opacity-40 scale-95' : ''}
        {!selected && !disabled ? 'hover:scale-[1.03] hover:shadow-xl cursor-pointer' : ''}
      "
      disabled={disabled || selected !== null}
      onclick={() => choose('A')}
      aria-label="Choose {optionA}"
    >
      <div class="option-a-gradient absolute inset-0 rounded-xl"></div>
      <div
        class="relative z-10 flex flex-col items-center justify-center h-full gap-3 p-6 min-h-[200px]"
      >
        {#if imageUrlA}
          <img
            src={imageUrlA}
            alt={optionA}
            loading="lazy"
            class="max-h-40 sm:max-h-48 w-auto object-contain rounded-lg shadow-md"
            onerror={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        {/if}
        <span class="text-xl sm:text-2xl text-center leading-tight">{optionA}</span>
        {#if selected === 'A'}
          <span
            class="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-3 py-1 text-sm text-brand-300"
          >
            <CheckIcon size={16} />
            Selected
          </span>
        {/if}
      </div>
    </button>

    <!-- VS Divider -->
    <div class="flex items-center justify-center shrink-0">
      <div
        class="vs-badge flex items-center justify-center w-12 h-12 rounded-full bg-surface-elevated border-2 border-border-default shadow-lg z-10"
      >
        <span class="text-sm font-black text-text-muted tracking-wider">VS</span>
      </div>
    </div>

    <!-- Option B Button -->
    <button
      class="option-btn flex-1 relative rounded-xl font-bold text-text-primary transition-all duration-300 shadow-lg overflow-hidden
        {selected === 'B' ? 'ring-4 ring-pink-400 scale-[1.02]' : ''}
        {selected === 'A' ? 'opacity-40 scale-95' : ''}
        {!selected && !disabled ? 'hover:scale-[1.03] hover:shadow-xl cursor-pointer' : ''}
      "
      disabled={disabled || selected !== null}
      onclick={() => choose('B')}
      aria-label="Choose {optionB}"
    >
      <div class="option-b-gradient absolute inset-0 rounded-xl"></div>
      <div
        class="relative z-10 flex flex-col items-center justify-center h-full gap-3 p-6 min-h-[200px]"
      >
        {#if imageUrlB}
          <img
            src={imageUrlB}
            alt={optionB}
            loading="lazy"
            class="max-h-40 sm:max-h-48 w-auto object-contain rounded-lg shadow-md"
            onerror={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        {/if}
        <span class="text-xl sm:text-2xl text-center leading-tight">{optionB}</span>
        {#if selected === 'B'}
          <span
            class="mt-1 inline-flex items-center gap-1 rounded-full bg-pink-500/20 px-3 py-1 text-sm text-pink-300"
          >
            <CheckIcon size={16} />
            Selected
          </span>
        {/if}
      </div>
    </button>
  </div>
</div>

<style>
  button {
    font-family: inherit;
  }

  .option-a-gradient {
    background: linear-gradient(
      135deg,
      rgba(var(--color-brand-600-rgb, 79, 70, 229), 0.15) 0%,
      rgba(var(--color-brand-500-rgb, 99, 102, 241), 0.05) 100%
    );
    border: 2px solid rgba(var(--color-brand-500-rgb, 99, 102, 241), 0.3);
    border-radius: inherit;
    transition: all 0.3s ease;
  }

  .option-btn:not(:disabled):hover .option-a-gradient {
    background: linear-gradient(
      135deg,
      rgba(var(--color-brand-600-rgb, 79, 70, 229), 0.25) 0%,
      rgba(var(--color-brand-500-rgb, 99, 102, 241), 0.1) 100%
    );
    border-color: rgba(var(--color-brand-400-rgb, 129, 140, 248), 0.5);
  }

  .option-b-gradient {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(219, 39, 119, 0.05) 100%);
    border: 2px solid rgba(236, 72, 153, 0.3);
    border-radius: inherit;
    transition: all 0.3s ease;
  }

  .option-btn:not(:disabled):hover .option-b-gradient {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(219, 39, 119, 0.1) 100%);
    border-color: rgba(244, 114, 182, 0.5);
  }

  .option-btn:disabled {
    cursor: not-allowed;
  }

  .option-btn:not(:disabled):active {
    transform: scale(0.97);
  }

  .vs-badge {
    animation: pulse-subtle 2s ease-in-out infinite;
  }

  @keyframes pulse-subtle {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }
</style>
