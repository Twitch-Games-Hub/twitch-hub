<script lang="ts">
  import { notificationStore } from '$lib/stores/notifications.svelte';
  import { BellIcon, XIcon } from '$lib/components/ui/icons';
  import { timeAgo } from '$lib/utils/date';
  import { NotificationStatus } from '@twitch-hub/shared-types';

  let dropdownOpen = $state(false);

  const badgeText = $derived(
    notificationStore.unreadCount > 9 ? '9+' : String(notificationStore.unreadCount),
  );

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
    if (dropdownOpen && !notificationStore.loaded) {
      notificationStore.fetchNotifications();
    }
  }

  function handleNotificationClick(notification: (typeof notificationStore.notifications)[0]) {
    if (notification.status === NotificationStatus.UNREAD) {
      notificationStore.markAsRead([notification.id]);
    }
    const data = notification.data as { sessionId?: string };
    if (data.sessionId) {
      window.location.href = `/play/${data.sessionId}`;
    }
    dropdownOpen = false;
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.notification-bell-container')) {
      dropdownOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="notification-bell-container relative">
  <button
    onclick={toggleDropdown}
    class="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
    aria-label="Notifications"
  >
    <BellIcon size={20} />
    {#if notificationStore.unreadCount > 0}
      <span
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white"
      >
        {badgeText}
      </span>
    {/if}
  </button>

  {#if dropdownOpen}
    <div
      class="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border-default bg-surface-secondary shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h3 class="text-sm font-semibold text-text-primary">Notifications</h3>
        {#if notificationStore.unreadCount > 0}
          <button
            onclick={() => notificationStore.markAllAsRead()}
            class="text-xs text-brand-400 hover:text-brand-300"
          >
            Mark all as read
          </button>
        {/if}
      </div>

      <div class="max-h-80 overflow-y-auto">
        {#if notificationStore.loading && !notificationStore.loaded}
          <div class="px-4 py-8 text-center text-sm text-text-muted">Loading...</div>
        {:else if notificationStore.notifications.length === 0}
          <div class="px-4 py-8 text-center text-sm text-text-muted">No notifications</div>
        {:else}
          {#each notificationStore.notifications as notification (notification.id)}
            <div
              class="group flex items-start gap-3 border-b border-border-subtle px-4 py-3 transition-colors hover:bg-surface-tertiary {notification.status ===
              NotificationStatus.UNREAD
                ? 'bg-brand-600/5'
                : ''}"
            >
              <button
                class="min-w-0 flex-1 text-left"
                onclick={() => handleNotificationClick(notification)}
              >
                <p class="text-sm font-medium text-text-primary">{notification.title}</p>
                <p class="mt-0.5 text-xs text-text-muted">{notification.body}</p>
                <p class="mt-1 text-xs text-text-muted">{timeAgo(notification.createdAt)} ago</p>
              </button>
              {#if notification.status === NotificationStatus.UNREAD}
                <span class="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-400"></span>
              {/if}
              <button
                onclick={() => notificationStore.dismiss(notification.id)}
                class="flex-shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
                aria-label="Dismiss"
              >
                <XIcon size={14} />
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
