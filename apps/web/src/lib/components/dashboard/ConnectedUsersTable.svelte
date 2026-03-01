<script lang="ts">
  import type { SessionUser } from '@twitch-hub/shared-types';
  import { UsersIcon } from '$lib/components/ui/icons';

  let { users }: { users: SessionUser[] } = $props();

  const MAX_VISIBLE = 20;

  const sortedUsers = $derived(
    [...users].sort((a, b) => {
      if (a.displayName && !b.displayName) return -1;
      if (!a.displayName && b.displayName) return 1;
      const nameA = a.displayName ?? '';
      const nameB = b.displayName ?? '';
      return nameA.localeCompare(nameB);
    }),
  );

  const visibleUsers = $derived(sortedUsers.slice(0, MAX_VISIBLE));
  const overflowCount = $derived(Math.max(0, sortedUsers.length - MAX_VISIBLE));

  function getInitial(user: SessionUser): string {
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    return '?';
  }
</script>

<div>
  <div class="mb-2 flex items-center gap-1.5">
    <UsersIcon size={14} />
    <h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted">
      Players ({users.length})
    </h4>
  </div>

  {#if sortedUsers.length === 0}
    <p class="py-4 text-center text-sm text-text-muted">No players connected</p>
  {:else}
    <div class="flex flex-wrap gap-1.5">
      {#each visibleUsers as user (user.socketId)}
        <div class="group relative" title={user.displayName ?? 'Anonymous'}>
          {#if user.profileImageUrl}
            <img
              src={user.profileImageUrl}
              alt={user.displayName ?? 'User'}
              class="h-9 w-9 rounded-full object-cover ring-2 ring-border-default transition-all group-hover:ring-brand-500"
            />
          {:else}
            <div
              class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-tertiary text-xs font-medium text-text-muted ring-2 ring-border-default transition-all group-hover:ring-brand-500"
            >
              {getInitial(user)}
            </div>
          {/if}
        </div>
      {/each}

      {#if overflowCount > 0}
        <div
          class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900/40 text-xs font-bold text-brand-400 ring-2 ring-brand-600/30"
        >
          +{overflowCount}
        </div>
      {/if}
    </div>
  {/if}
</div>
