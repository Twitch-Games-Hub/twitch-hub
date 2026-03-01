<script lang="ts">
  import '../app.css';
  import { authStore } from '$lib/stores/auth.svelte';
  import { notificationStore } from '$lib/stores/notifications.svelte';
  import { gamificationStore } from '$lib/stores/gamification.svelte';
  import XpBar from '$lib/components/gamification/XpBar.svelte';
  import { onMount, onDestroy } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import NotificationBell from '$lib/components/ui/NotificationBell.svelte';
  import { TwitchIcon, MenuIcon, XIcon, GamepadIcon, PlusIcon } from '$lib/components/ui/icons';
  import { page } from '$app/stores';
  import { getDashboardSocket } from '$lib/socket';
  import type { ApiNotification } from '@twitch-hub/shared-types';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

  let { children } = $props();
  let mobileMenuOpen = $state(false);
  let onDashboard = $derived($page.url.pathname.startsWith('/dashboard'));
  let isOverlay = $derived($page.url.pathname.startsWith('/overlay'));
  let notificationSocketBound = false;

  onMount(() => {
    authStore.fetchSession();
  });

  // Set up notification socket and fetch gamification profile when user becomes available
  $effect(() => {
    if (authStore.user && !notificationSocketBound) {
      notificationSocketBound = true;
      notificationStore.fetchCount();
      gamificationStore.fetchProfile();
      setupNotificationSocket();
    }
  });

  async function setupNotificationSocket() {
    try {
      const res = await fetch('/api/auth/token');
      if (!res.ok) return;
      const { token } = await res.json();
      const socket = getDashboardSocket(token);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = socket as any;
      raw.on('notification:received', (notification: ApiNotification) => {
        notificationStore.addRealtime(notification);
      });
      raw.on('notification:count', (data: { unreadCount: number }) => {
        notificationStore.setUnreadCount(data.unreadCount);
      });
    } catch {
      // Silently fail - notifications are non-critical
    }
  }

  onDestroy(() => {
    if (notificationSocketBound) {
      notificationSocketBound = false;
    }
  });
</script>

{#if isOverlay}
  {@render children()}
{:else}
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
  >
    Skip to content
  </a>

  <div class="min-h-screen bg-surface-primary text-text-primary">
    <nav class="border-b border-border-default bg-surface-secondary">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <a href="/" class="flex items-center gap-2 text-xl font-bold text-brand-400">
          <GamepadIcon size={24} />
          Twitch Hub
        </a>

        <!-- Desktop nav -->
        <div class="hidden items-center gap-4 sm:flex">
          <Button href="/explore" variant="ghost" size="sm">Explore</Button>
          {#if authStore.loading}
            <div class="h-8 w-24 animate-pulse rounded-lg bg-surface-elevated"></div>
          {:else if authStore.user}
            <Button href="/dashboard" variant="ghost" size="sm">Dashboard</Button>
            <Button href="/dashboard/sessions" variant="ghost" size="sm">Sessions</Button>
            {#if !onDashboard}
              <Button href="/dashboard/games/new" size="sm">
                <PlusIcon size={16} />
                New Game
              </Button>
            {/if}
            <NotificationBell />
            <a
              href="/dashboard/profile"
              class="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-surface-tertiary"
            >
              {#if authStore.user.profileImageUrl}
                <img src={authStore.user.profileImageUrl} alt="" class="h-7 w-7 rounded-full" />
              {/if}
              <span class="text-sm text-text-secondary">{authStore.user.displayName}</span>
              {#if gamificationStore.profile}
                <XpBar
                  level={gamificationStore.profile.level}
                  currentXp={gamificationStore.profile.totalXp}
                  xpNeededForNext={gamificationStore.profile.xpNeededForNext}
                  xpInCurrentLevel={gamificationStore.profile.xpInCurrentLevel}
                  compact
                />
              {/if}
            </a>
          {:else}
            <Button href="/auth/login" size="sm">
              <TwitchIcon size={16} />
              Connect with Twitch
            </Button>
          {/if}
        </div>

        <!-- Mobile menu button -->
        <button
          class="rounded-lg p-2 text-text-muted hover:bg-surface-tertiary sm:hidden"
          onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {#if mobileMenuOpen}
            <XIcon size={20} />
          {:else}
            <MenuIcon size={20} />
          {/if}
        </button>
      </div>

      <!-- Mobile nav -->
      {#if mobileMenuOpen}
        <div class="animate-slide-down border-t border-border-subtle px-4 py-3 space-y-1 sm:hidden">
          <Button
            href="/explore"
            variant="ghost"
            size="sm"
            class="w-full !justify-start"
            onclick={() => (mobileMenuOpen = false)}
          >
            Explore
          </Button>
          {#if authStore.user}
            <a
              href="/dashboard/profile"
              class="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-surface-tertiary"
              onclick={() => (mobileMenuOpen = false)}
            >
              {#if authStore.user.profileImageUrl}
                <img src={authStore.user.profileImageUrl} alt="" class="h-7 w-7 rounded-full" />
              {/if}
              <span class="text-sm text-text-secondary">{authStore.user.displayName}</span>
            </a>
            <Button
              href="/dashboard"
              variant="ghost"
              size="sm"
              class="w-full !justify-start"
              onclick={() => (mobileMenuOpen = false)}
            >
              Dashboard
            </Button>
            <Button
              href="/dashboard/sessions"
              variant="ghost"
              size="sm"
              class="w-full !justify-start"
              onclick={() => (mobileMenuOpen = false)}
            >
              Sessions
            </Button>
            {#if !onDashboard}
              <Button
                href="/dashboard/games/new"
                size="sm"
                class="w-full"
                onclick={() => (mobileMenuOpen = false)}
              >
                <PlusIcon size={16} />
                New Game
              </Button>
            {/if}
          {:else}
            <Button href="/auth/login" size="sm" class="w-full">
              <TwitchIcon size={16} />
              Connect with Twitch
            </Button>
          {/if}
        </div>
      {/if}
    </nav>

    <main id="main">
      {@render children()}
    </main>

    <footer class="border-t border-border-subtle py-6 text-center text-sm text-text-muted">
      Twitch Hub &middot; Interactive games for streamers
    </footer>
  </div>

  <ToastContainer />
{/if}
