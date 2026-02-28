<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let { children } = $props();

  onMount(async () => {
    await authStore.fetchSession();
    if (!authStore.user) {
      goto('/auth/login');
    }
  });
</script>

{#if authStore.loading}
  <div class="flex min-h-[70vh] items-center justify-center">
    <div class="text-gray-400">Loading...</div>
  </div>
{:else if authStore.user}
  {@render children()}
{/if}
