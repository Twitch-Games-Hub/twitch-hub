<script lang="ts">
  import type { SessionUser } from '@twitch-hub/shared-types';
  import Card from '$lib/components/ui/Card.svelte';

  let { users }: { users: SessionUser[] } = $props();

  const sortedUsers = $derived(
    [...users].sort((a, b) => {
      // Authenticated users first
      if (a.displayName && !b.displayName) return -1;
      if (!a.displayName && b.displayName) return 1;
      // Alphabetical within each group
      const nameA = a.displayName ?? '';
      const nameB = b.displayName ?? '';
      return nameA.localeCompare(nameB);
    }),
  );
</script>

<Card padding="none">
  <div class="px-4 py-3 border-b border-border-default">
    <h4 class="text-sm font-semibold text-text-primary">
      Connected Users ({users.length})
    </h4>
  </div>

  {#if sortedUsers.length === 0}
    <div class="px-4 py-6 text-center text-sm text-text-muted">No users connected</div>
  {:else}
    <div class="max-h-48 overflow-y-auto">
      {#each sortedUsers as user (user.socketId)}
        <div
          class="flex items-center gap-3 px-4 py-2 border-b border-border-default last:border-b-0"
        >
          {#if user.profileImageUrl}
            <img
              src={user.profileImageUrl}
              alt={user.displayName ?? 'User'}
              class="h-7 w-7 rounded-full object-cover flex-shrink-0"
            />
          {:else}
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-tertiary text-xs text-text-muted flex-shrink-0"
            >
              ?
            </div>
          {/if}
          {#if user.displayName}
            <span class="text-sm text-text-primary truncate">{user.displayName}</span>
          {:else}
            <span class="text-sm italic text-text-muted truncate">Anonymous</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Card>
