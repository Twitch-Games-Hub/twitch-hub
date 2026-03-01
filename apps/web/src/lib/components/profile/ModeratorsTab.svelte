<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiPost, apiPut } from '$lib/api';
  import type { ApiModeratorLink } from '@twitch-hub/shared-types';
  import { toastStore } from '$lib/stores/toast.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { RefreshIcon } from '$lib/components/ui/icons';

  let moderators = $state<ApiModeratorLink[]>([]);
  let loading = $state(true);
  let syncing = $state(false);
  let syncError = $state(false);

  onMount(async () => {
    await fetchModerators();
  });

  async function fetchModerators() {
    loading = true;
    syncError = false;
    try {
      const data = await apiGet<{ moderators: ApiModeratorLink[] }>('/api/moderators');
      moderators = data.moderators;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('moderation:read') || message.includes('502')) {
        syncError = true;
      } else {
        toastStore.add('Failed to load moderators', 'error');
      }
    } finally {
      loading = false;
    }
  }

  async function syncFromTwitch() {
    syncing = true;
    syncError = false;
    try {
      const data = await apiPost<{ moderators: ApiModeratorLink[] }>('/api/moderators/sync', {});
      moderators = data.moderators;
      toastStore.add('Moderators synced from Twitch', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('moderation:read') || message.includes('re-authorize')) {
        syncError = true;
      }
      toastStore.add('Failed to sync moderators', 'error');
    } finally {
      syncing = false;
    }
  }

  async function toggleMod(mod: ApiModeratorLink) {
    const prevEnabled = mod.enabled;
    mod.enabled = !mod.enabled;
    try {
      await apiPut(`/api/moderators/${mod.modTwitchId}`, { enabled: mod.enabled });
      toastStore.add(
        `${mod.modDisplayName} ${mod.enabled ? 'enabled' : 'disabled'} as moderator`,
        'success',
      );
    } catch {
      mod.enabled = prevEnabled;
      toastStore.add('Failed to update moderator', 'error');
    }
  }
</script>

{#if syncError}
  <Card class="mb-6 border-amber-500/30 bg-amber-500/10">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-medium text-amber-400">Missing Twitch Permission</p>
        <p class="mt-0.5 text-xs text-text-muted">
          The <code class="rounded bg-surface-tertiary px-1">moderation:read</code> scope is required
          to sync your moderator list. Re-authorize to grant this permission.
        </p>
      </div>
      <a
        href="/api/auth/twitch"
        class="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-500"
      >
        Re-authorize with Twitch
      </a>
    </div>
  </Card>
{/if}

<Card>
  <div class="flex items-center justify-between mb-4">
    <div>
      <h2 class="text-lg font-semibold text-text-primary">Moderator Management</h2>
      <p class="mt-1 text-sm text-text-muted">
        Manage which of your Twitch moderators can create and control game sessions on your behalf.
      </p>
    </div>
    <Button onclick={syncFromTwitch} variant="secondary" size="sm" loading={syncing}>
      <RefreshIcon size={14} />
      Sync
    </Button>
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each [1, 2, 3] as n (n)}
        <Skeleton height="3rem" rounded="rounded-lg" />
      {/each}
    </div>
  {:else if moderators.length === 0}
    <EmptyState
      title="No moderators found"
      description="Your Twitch channel has no moderators, or the moderator list hasn't been synced yet."
    />
  {:else}
    <div class="divide-y divide-border-subtle">
      {#each moderators as mod (mod.id)}
        <div class="flex items-center justify-between py-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text-primary">{mod.modDisplayName}</p>
            <p class="text-xs text-text-muted">@{mod.modLogin}</p>
          </div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={mod.enabled}
              onchange={() => toggleMod(mod)}
              class="peer sr-only"
            />
            <div
              class="h-6 w-11 rounded-full bg-surface-tertiary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full"
            ></div>
          </label>
        </div>
      {/each}
    </div>
  {/if}

  <div class="mt-4 rounded-lg bg-surface-tertiary/50 px-3 py-2">
    <p class="text-xs text-text-muted">
      Enabled moderators can create game sessions, control session flow (start/next/end), and send
      invites on your behalf. They cannot edit or delete your games.
    </p>
  </div>
</Card>
