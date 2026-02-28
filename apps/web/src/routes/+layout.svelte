<script lang="ts">
  import '../app.css';
  import { authStore } from '$lib/stores/auth.svelte';
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { TwitchIcon, MenuIcon, XIcon } from '$lib/components/ui/icons';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

  let { children } = $props();
  let mobileMenuOpen = $state(false);

  onMount(() => {
    authStore.fetchSession();
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
      <a href="/" class="text-xl font-bold text-brand-400">Twitch Hub</a>

      <!-- Desktop nav -->
      <div class="hidden items-center gap-4 sm:flex">
        {#if authStore.loading}
          <div class="h-8 w-24 animate-pulse rounded-lg bg-surface-elevated"></div>
        {:else if authStore.user}
          <a
            href="/dashboard"
            class="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Dashboard
          </a>
          <div class="flex items-center gap-2">
            {#if authStore.user.profileImageUrl}
              <img src={authStore.user.profileImageUrl} alt="" class="h-7 w-7 rounded-full" />
            {/if}
            <span class="text-sm text-text-secondary">{authStore.user.displayName}</span>
          </div>
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
      <div class="animate-slide-down border-t border-border-subtle px-4 py-3 sm:hidden">
        {#if authStore.user}
          <div class="flex items-center gap-2 pb-3">
            {#if authStore.user.profileImageUrl}
              <img src={authStore.user.profileImageUrl} alt="" class="h-7 w-7 rounded-full" />
            {/if}
            <span class="text-sm text-text-secondary">{authStore.user.displayName}</span>
          </div>
          <a
            href="/dashboard"
            class="block rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
            onclick={() => (mobileMenuOpen = false)}
          >
            Dashboard
          </a>
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
