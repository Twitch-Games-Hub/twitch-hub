<script lang="ts">
  let {
    steps,
    currentStep,
    completedSteps,
    onStepClick,
  }: {
    steps: { label: string }[];
    currentStep: number;
    completedSteps: Set<number>;
    onStepClick: (index: number) => void;
  } = $props();
</script>

<nav class="flex border-b border-border-default">
  {#each steps as step, i (i)}
    {@const isActive = i === currentStep}
    {@const isCompleted = completedSteps.has(i)}
    {@const isClickable = isCompleted && !isActive}
    <button
      type="button"
      onclick={() => isClickable && onStepClick(i)}
      disabled={!isCompleted && !isActive}
      class="flex-1 px-4 py-3 text-center text-sm font-medium transition-colors
        {isActive
        ? 'border-b-2 border-brand-400 text-brand-400'
        : isCompleted
          ? 'text-text-primary hover:text-brand-400'
          : 'cursor-not-allowed text-text-muted'}"
    >
      {step.label}
    </button>
  {/each}
</nav>
