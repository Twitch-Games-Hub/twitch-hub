<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { TwitchIcon } from '$lib/components/ui/icons';
  import { authStore } from '$lib/stores/auth.svelte';
</script>

<svelte:head>
  <title>Login - Twitch Hub</title>
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center px-4">
  <Card padding="lg" class="animate-fade-in w-full max-w-md text-center">
    <TwitchIcon size={48} class="mx-auto mb-4 text-brand-400" />
    <h1 class="mb-3 text-2xl font-bold text-text-primary">Connect Your Twitch Account</h1>
    <p class="mb-8 text-text-secondary">
      Log in with Twitch to create and manage interactive games for your stream.
    </p>

    {#if authStore.error}
      <div
        class="mb-4 rounded-lg border border-danger-500/20 bg-danger-900/20 px-4 py-3 text-sm text-danger-500"
      >
        {authStore.error}
      </div>
    {/if}

    <Button href="/api/auth/twitch" size="lg" class="w-full">
      <TwitchIcon size={20} />
      Connect with Twitch
    </Button>
  </Card>
</div>
