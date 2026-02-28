<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiPost } from '$lib/api';
  import { GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { toastStore } from '$lib/stores/toast.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { PlusIcon, TrashIcon } from '$lib/components/ui/icons';

  let selectedType = $state<GameType>(GameType.HOT_TAKE);
  let title = $state('');
  let statements = $state<string[]>(['']);
  let submitting = $state(false);

  const allTypes = Object.values(GameType).map((value) => ({
    value,
    ...GAME_TYPE_META[value],
  }));

  function addStatement() {
    statements = [...statements, ''];
  }

  function removeStatement(index: number) {
    statements = statements.filter((_, i) => i !== index);
  }

  function updateStatement(index: number, value: string) {
    statements = statements.map((s, i) => (i === index ? value : s));
  }

  async function submit() {
    if (!title.trim()) return;
    submitting = true;

    try {
      let config: unknown;
      switch (selectedType) {
        case GameType.HOT_TAKE:
          config = {
            statements: statements.filter((s) => s.trim()),
            roundDurationSec: 30,
          };
          break;
        case GameType.BALANCE:
          config = { questions: [] };
          break;
        case GameType.BRACKET:
          config = { items: [], bracketSize: 8 };
          break;
        default:
          config = {};
      }

      const game = await apiPost<{ id: string }>('/api/games', {
        type: selectedType,
        title: title.trim(),
        config,
      });

      goto(`/dashboard/games/${game.id}`);
    } catch (err) {
      toastStore.add(err instanceof Error ? err.message : 'Failed to create game', 'error');
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Game - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
  <PageHeader title="Create New Game" back="/dashboard" />

  <Card padding="lg">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      class="space-y-6"
    >
      <div>
        <label for="title" class="mb-2 block text-sm font-medium text-text-secondary">
          Game Title
        </label>
        <input
          id="title"
          type="text"
          bind:value={title}
          placeholder="My Awesome Game"
          class="w-full rounded-lg border border-border-default bg-surface-tertiary px-4 py-2 text-text-primary placeholder-text-muted focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/50"
        />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-text-secondary">Game Type</label>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each allTypes as type (type.value)}
            {@const isAvailable = type.available}
            <button
              type="button"
              onclick={() => isAvailable && (selectedType = type.value)}
              disabled={!isAvailable}
              class="relative rounded-lg border p-3 text-left transition-colors {selectedType ===
              type.value
                ? 'border-brand-400 bg-brand-600/10'
                : isAvailable
                  ? 'border-border-default bg-surface-tertiary hover:border-border-default/80'
                  : 'cursor-not-allowed border-border-subtle bg-surface-tertiary opacity-50'}"
            >
              <div class="font-medium text-text-primary">{type.label}</div>
              <div class="text-xs text-text-muted">{type.description}</div>
              {#if !isAvailable}
                <span
                  class="absolute right-2 top-2 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted"
                >
                  Coming Soon
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      {#if selectedType === GameType.HOT_TAKE}
        <div>
          <label class="mb-2 block text-sm font-medium text-text-secondary">Statements</label>
          <div class="space-y-2">
            {#each statements as statement, i (i)}
              <div class="flex gap-2">
                <input
                  type="text"
                  value={statement}
                  oninput={(e) => updateStatement(i, (e.target as HTMLInputElement).value)}
                  placeholder="Enter a hot take statement..."
                  class="flex-1 rounded-lg border border-border-default bg-surface-tertiary px-4 py-2 text-text-primary placeholder-text-muted focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/50"
                />
                {#if statements.length > 1}
                  <button
                    type="button"
                    onclick={() => removeStatement(i)}
                    class="rounded-lg border border-danger-500/20 bg-danger-900/20 px-3 text-danger-500 transition-colors hover:bg-danger-900/40"
                    aria-label="Remove statement {i + 1}"
                  >
                    <TrashIcon size={16} />
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          <button
            type="button"
            onclick={addStatement}
            class="mt-2 inline-flex items-center gap-1 text-sm text-brand-400 transition-colors hover:text-brand-300"
          >
            <PlusIcon size={14} />
            Add Statement
          </button>
        </div>
      {/if}

      <Button type="submit" size="lg" loading={submitting} disabled={!title.trim()} class="w-full">
        {submitting ? 'Creating...' : 'Create Game'}
      </Button>
    </form>
  </Card>
</div>
