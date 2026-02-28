<script lang="ts">
  import { page } from '$app/stores';
  import Button from '$lib/components/ui/Button.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
</script>

<svelte:head>
  <title>{$page.status === 404 ? 'Page Not Found' : 'Error'} - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-20">
  {#if $page.status === 404}
    <EmptyState
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
    >
      {#snippet action()}
        <Button href="/">Go Home</Button>
      {/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Something went wrong"
      description={$page.error?.message || 'An unexpected error occurred.'}
    >
      {#snippet action()}
        <Button onclick={() => location.reload()}>Try Again</Button>
      {/snippet}
    </EmptyState>
  {/if}
</div>
