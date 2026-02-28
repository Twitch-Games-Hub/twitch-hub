<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  let { children } = $props();

  $effect(() => {
    if (!authStore.loading && !authStore.user) {
      goto('/auth/login');
    }
  });
</script>

{#if authStore.loading}
  <div class="mx-auto max-w-5xl px-4 py-8">
    <Skeleton width="200px" height="2rem" class="mb-8" />
    <div class="space-y-4">
      <Skeleton height="5rem" rounded="rounded-xl" />
      <Skeleton height="5rem" rounded="rounded-xl" />
      <Skeleton height="5rem" rounded="rounded-xl" />
    </div>
  </div>
{:else if authStore.user}
  {@render children()}
{/if}
