<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import type { SessionUser } from '@twitch-hub/shared-types';

  let { users, totalCount }: { users: SessionUser[]; totalCount: number } = $props();

  const MAX_VISIBLE = 10;

  const visibleUsers = $derived(users.slice(0, MAX_VISIBLE));
  const overflowCount = $derived(Math.max(0, totalCount - MAX_VISIBLE));

  let newUserIds = new SvelteSet<string>();
  let prevSocketIds = new SvelteSet<string>();
  let countPulsing = $state(false);
  let prevTotalCount = $state(totalCount);

  $effect(() => {
    const currentIds = new SvelteSet(users.map((u) => u.socketId));
    const added: string[] = [];
    for (const id of currentIds) {
      if (!prevSocketIds.has(id)) added.push(id);
    }
    if (added.length > 0) {
      for (const id of added) newUserIds.add(id);
      setTimeout(() => {
        for (const id of added) newUserIds.delete(id);
      }, 400);
    }
    prevSocketIds = currentIds;
  });

  $effect(() => {
    if (totalCount !== prevTotalCount) {
      prevTotalCount = totalCount;
      countPulsing = true;
      setTimeout(() => {
        countPulsing = false;
      }, 300);
    }
  });
</script>

<div class="flex items-center gap-1.5 overflow-hidden">
  {#each visibleUsers as user (user.socketId)}
    <div
      class="relative shrink-0 {newUserIds.has(user.socketId) ? 'animate-slide-from-right' : ''}"
      title={user.displayName}
    >
      {#if user.profileImageUrl}
        <img
          src={user.profileImageUrl}
          alt={user.displayName}
          class="h-8 w-8 rounded-full object-cover ring-2 ring-border-default"
        />
      {:else}
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-xs font-bold text-text-secondary ring-2 ring-border-default"
        >
          {user.displayName?.charAt(0).toUpperCase() ?? '?'}
        </div>
      {/if}
    </div>
  {/each}
  {#if overflowCount > 0}
    <div
      class="flex h-8 min-w-8 items-center justify-center rounded-full bg-surface-elevated px-1.5 text-xs font-semibold text-text-muted ring-2 ring-border-default {countPulsing
        ? 'animate-count-pop'
        : ''}"
    >
      +{overflowCount}
    </div>
  {/if}
</div>

<style>
  @keyframes slide-from-right {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-slide-from-right {
    animation: slide-from-right 0.4s ease-out;
  }
</style>
