<script lang="ts">
  import Button from './Button.svelte';

  let {
    currentStep,
    totalSteps,
    canAdvance,
    submitting,
    submitLabel = 'Create Game',
    submittingLabel = 'Creating...',
    cancelHref,
    onBack,
    onNext,
    onSubmit,
  }: {
    currentStep: number;
    totalSteps: number;
    canAdvance: boolean;
    submitting: boolean;
    submitLabel?: string;
    submittingLabel?: string;
    cancelHref?: string;
    onBack: () => void;
    onNext: () => void;
    onSubmit: () => void;
  } = $props();

  const isLastStep = $derived(currentStep === totalSteps - 1);
</script>

<div class="flex justify-between gap-3">
  <div class="flex gap-2">
    {#if currentStep > 0}
      <Button variant="ghost" onclick={onBack}>Back</Button>
    {/if}
    {#if cancelHref}
      <Button variant="ghost" href={cancelHref}>Cancel</Button>
    {/if}
    {#if currentStep === 0 && !cancelHref}
      <div></div>
    {/if}
  </div>

  {#if isLastStep}
    <Button variant="primary" onclick={onSubmit} disabled={!canAdvance} loading={submitting}>
      {submitting ? submittingLabel : submitLabel}
    </Button>
  {:else}
    <Button variant="primary" onclick={onNext} disabled={!canAdvance}>Next</Button>
  {/if}
</div>
