<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import ActiveSessionsBar from '$lib/components/dashboard/ActiveSessionsBar.svelte';

  let { children } = $props();

  $effect(() => {
    if (browser && !authStore.loading && !authStore.user) {
      goto(resolve('/auth/login'));
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
  <ActiveSessionsBar />
  {@render children()}
{/if}
