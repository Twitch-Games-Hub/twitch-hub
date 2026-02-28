<script lang="ts">
  import '../app.css';
  import { authStore } from '$lib/stores/auth.svelte';
  import { posthogStore } from '$lib/stores/posthog.svelte';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import Button from '$lib/components/ui/Button.svelte';
  import { TwitchIcon, MenuIcon, XIcon, GamepadIcon, PlusIcon } from '$lib/components/ui/icons';
  import { page } from '$app/stores';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

  let { children } = $props();
  let mobileMenuOpen = $state(false);
  let onDashboard = $derived($page.url.pathname.startsWith('/dashboard'));

  onMount(() => {
    authStore.fetchSession();
  });

  afterNavigate(({ to }) => {
    if (to?.url) posthogStore.capturePageview(to.url.pathname);
  });

  $effect(() => {
    if (authStore.user) {
      posthogStore.identify(authStore.user);
    }
  });
</script>

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
          <Button href="/dashboard/billing" variant="ghost" size="sm">Billing</Button>
          {#if !onDashboard}
            <Button href="/dashboard/games/new" size="sm">
              <PlusIcon size={16} />
              New Game
            </Button>
          {/if}
          <a
            href="/dashboard/profile"
            class="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-surface-tertiary"
          >
            {#if authStore.user.profileImageUrl}
              <img src={authStore.user.profileImageUrl} alt="" class="h-7 w-7 rounded-full" />
            {/if}
            <span class="text-sm text-text-secondary">{authStore.user.displayName}</span>
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
          <Button
            href="/dashboard/billing"
            variant="ghost"
            size="sm"
            class="w-full !justify-start"
            onclick={() => (mobileMenuOpen = false)}
          >
            Billing
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
