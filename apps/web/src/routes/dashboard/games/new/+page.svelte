<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiPost } from '$lib/api';
  import { GameType } from '@twitch-hub/shared-types';

  let selectedType = $state<string>(GameType.HOT_TAKE);
  let title = $state('');
  let statements = $state<string[]>(['']);
  let submitting = $state(false);

  const gameTypes = [
    { value: GameType.HOT_TAKE, label: 'Hot Take Meter', description: 'Rate statements 1-10' },
    { value: GameType.BALANCE, label: 'Balance Game', description: 'Would you rather A vs B' },
    { value: GameType.BRACKET, label: 'World Cup Bracket', description: 'Elimination bracket voting' },
    { value: GameType.PERSONALITY, label: 'Personality Quiz', description: 'Multi-question personality quiz' },
    { value: GameType.TIER_LIST, label: 'Tier List', description: 'Community tier rankings' },
    { value: GameType.BLIND_TEST, label: 'Blind Test', description: 'Guess with timed hints' },
  ];

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
            statements: statements.filter(s => s.trim()),
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
      console.error('Failed to create game:', err);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Game - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="mb-8 text-3xl font-bold">Create New Game</h1>

  <form onsubmit={(e) => { e.preventDefault(); submit(); }} class="space-y-6">
    <div>
      <label for="title" class="mb-2 block text-sm font-medium text-gray-300">Game Title</label>
      <input
        id="title"
        type="text"
        bind:value={title}
        placeholder="My Awesome Game"
        class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
      />
    </div>

    <div>
      <label class="mb-2 block text-sm font-medium text-gray-300">Game Type</label>
      <div class="grid gap-3 sm:grid-cols-2">
        {#each gameTypes as type}
          <button
            type="button"
            onclick={() => (selectedType = type.value)}
            class="rounded-lg border p-3 text-left {selectedType === type.value
              ? 'border-purple-500 bg-purple-900/30'
              : 'border-gray-700 bg-gray-800 hover:border-gray-600'}"
          >
            <div class="font-medium">{type.label}</div>
            <div class="text-xs text-gray-400">{type.description}</div>
          </button>
        {/each}
      </div>
    </div>

    {#if selectedType === GameType.HOT_TAKE}
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-300">Statements</label>
        <div class="space-y-2">
          {#each statements as statement, i}
            <div class="flex gap-2">
              <input
                type="text"
                value={statement}
                oninput={(e) => updateStatement(i, (e.target as HTMLInputElement).value)}
                placeholder="Enter a hot take statement..."
                class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              {#if statements.length > 1}
                <button
                  type="button"
                  onclick={() => removeStatement(i)}
                  class="rounded-lg bg-red-900/50 px-3 text-red-400 hover:bg-red-900"
                >
                  X
                </button>
              {/if}
            </div>
          {/each}
        </div>
        <button
          type="button"
          onclick={addStatement}
          class="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Statement
        </button>
      </div>
    {/if}

    <button
      type="submit"
      disabled={submitting || !title.trim()}
      class="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
    >
      {submitting ? 'Creating...' : 'Create Game'}
    </button>
  </form>
</div>
