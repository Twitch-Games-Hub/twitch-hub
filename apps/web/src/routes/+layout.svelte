<script lang="ts">
  import '../app.css';
  import { authStore } from '$lib/stores/auth.svelte';

  let { children } = $props();
</script>

<div class="min-h-screen bg-gray-950 text-gray-100">
  <nav class="border-b border-gray-800 bg-gray-900">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <a href="/" class="text-xl font-bold text-purple-400">Twitch Hub</a>
      <div class="flex items-center gap-4">
        {#if authStore.user}
          <a href="/dashboard" class="text-sm text-gray-300 hover:text-white">Dashboard</a>
          <span class="text-sm text-gray-400">{authStore.user.displayName}</span>
        {:else}
          <a
            href="/auth/login"
            class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Connect with Twitch
          </a>
        {/if}
      </div>
    </div>
  </nav>

  <main>
    {@render children()}
  </main>
</div>
