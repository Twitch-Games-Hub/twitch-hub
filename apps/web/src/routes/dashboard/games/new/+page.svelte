<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { apiPost } from '$lib/api';
  import { toastStore } from '$lib/stores/toast.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import GameWizard from '$lib/components/editor/GameWizard.svelte';
  import type { GameType } from '@twitch-hub/shared-types';

  let submitting = $state(false);

  async function handleSubmit(data: {
    type: GameType;
    title: string;
    description?: string;
    coverImageUrl?: string;
    config: unknown;
  }) {
    submitting = true;
    try {
      const game = await apiPost<{ id: string }>('/api/games', data);
      goto(resolve(`/dashboard/games/${game.id}`));
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
    <GameWizard mode="create" {submitting} onsubmit={handleSubmit} />
  </Card>
</div>
