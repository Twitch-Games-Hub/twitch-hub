<script lang="ts">
  import { GameType } from '@twitch-hub/shared-types';
  import { getDefaultConfig, sanitizeConfig } from '$lib/utils/gameConfig';
  import Label from '$lib/components/ui/Label.svelte';
  import StepIndicator from '$lib/components/ui/StepIndicator.svelte';
  import WizardNavigation from '$lib/components/ui/WizardNavigation.svelte';
  import GameTypeSelector from './GameTypeSelector.svelte';
  import GameDetailsForm from './GameDetailsForm.svelte';
  import GameSpecificEditor from './GameSpecificEditor.svelte';
  import GameConfigReview from './GameConfigReview.svelte';

  let {
    mode,
    gameType,
    initialTitle = '',
    initialDescription = '',
    initialCoverImageUrl = '',
    initialConfig,
    submitting,
    onsubmit,
    cancelHref,
  }: {
    mode: 'create' | 'edit';
    gameType?: GameType;
    initialTitle?: string;
    initialDescription?: string;
    initialCoverImageUrl?: string;
    initialConfig?: unknown;
    submitting: boolean;
    onsubmit: (data: {
      type: GameType;
      title: string;
      description?: string;
      coverImageUrl?: string;
      config: unknown;
    }) => void;
    cancelHref?: string;
  } = $props();

  const isCreate = $derived(mode === 'create');

  const STEPS = $derived(
    isCreate
      ? [{ label: 'Game Type' }, { label: 'Details' }, { label: 'Config' }, { label: 'Review' }]
      : [{ label: 'Details' }, { label: 'Config' }, { label: 'Review' }],
  );

  // Map step index to semantic view name
  const VIEW_ORDER = $derived<Array<'type' | 'details' | 'config' | 'review'>>(
    isCreate ? ['type', 'details', 'config', 'review'] : ['details', 'config', 'review'],
  );

  // Wizard state
  let currentStep = $state(0);
  // svelte-ignore state_referenced_locally
  let completedSteps = $state(isCreate ? new Set<number>([0]) : new Set<number>([0, 1, 2]));

  // Form state — intentionally capture initial prop values once
  // svelte-ignore state_referenced_locally
  let selectedType = $state<GameType>(gameType ?? GameType.HOT_TAKE);
  // svelte-ignore state_referenced_locally
  let lastConfirmedType = $state<GameType>(gameType ?? GameType.HOT_TAKE);
  // svelte-ignore state_referenced_locally
  let title = $state(initialTitle);
  // svelte-ignore state_referenced_locally
  let description = $state(initialDescription);
  // svelte-ignore state_referenced_locally
  let coverImageUrl = $state(initialCoverImageUrl);
  // svelte-ignore state_referenced_locally
  let config = $state<unknown>(initialConfig ?? getDefaultConfig(selectedType));

  const currentView = $derived(VIEW_ORDER[currentStep]);

  const canAdvance = $derived(
    currentView === 'type' || currentView === 'config' ? true : title.trim().length > 0,
  );

  const submitLabel = $derived(isCreate ? 'Create Game' : 'Save Changes');
  const submittingLabel = $derived(isCreate ? 'Creating...' : 'Saving...');

  function goToStep(step: number) {
    if (step < currentStep) {
      currentStep = step;
    }
  }

  function handleNext() {
    if (!canAdvance) return;

    // Reset config if type changed (create mode only, when advancing past type/details)
    if (isCreate && (currentView === 'type' || currentView === 'details')) {
      if (selectedType !== lastConfirmedType) {
        config = getDefaultConfig(selectedType);
        lastConfirmedType = selectedType;
      }
    }

    completedSteps = new Set([...completedSteps, currentStep, currentStep + 1]);
    currentStep += 1;
  }

  function handleBack() {
    if (currentStep > 0) {
      currentStep -= 1;
    }
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onsubmit({
      type: selectedType,
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(coverImageUrl.trim() ? { coverImageUrl: coverImageUrl.trim() } : {}),
      config: sanitizeConfig(selectedType, config),
    });
  }
</script>

<div class="mb-6">
  <StepIndicator steps={STEPS} {currentStep} {completedSteps} onStepClick={goToStep} />
</div>

{#if currentView === 'type'}
  <div class="space-y-4">
    <Label>Choose a Game Type</Label>
    <GameTypeSelector selected={selectedType} onselect={(type) => (selectedType = type)} />
  </div>
{:else if currentView === 'details'}
  <div class="space-y-6">
    <GameDetailsForm bind:title bind:description bind:coverImageUrl />
  </div>
{:else if currentView === 'config'}
  {#key selectedType}
    <GameSpecificEditor
      gameType={selectedType}
      {config}
      onchange={(updated) => (config = updated)}
    />
  {/key}
{:else if currentView === 'review'}
  <GameConfigReview gameType={selectedType} {title} {description} {coverImageUrl} {config} />
{/if}

<div class="mt-6">
  <WizardNavigation
    {currentStep}
    totalSteps={STEPS.length}
    {canAdvance}
    {submitting}
    {submitLabel}
    {submittingLabel}
    {cancelHref}
    onBack={handleBack}
    onNext={handleNext}
    onSubmit={handleSubmit}
  />
</div>

{#if currentView === 'review' && isCreate}
  <p class="mt-3 text-center text-xs text-text-muted">
    Games are saved as drafts. You can publish to the community gallery after creating.
  </p>
{/if}
