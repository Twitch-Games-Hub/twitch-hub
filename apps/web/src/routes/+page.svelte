<script lang="ts">
  import { GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { TwitchIcon, FireIcon } from '$lib/components/ui/icons';

  const allTypes = Object.values(GameType).map((value) => ({
    value,
    ...GAME_TYPE_META[value],
  }));

  const steps = [
    {
      step: '1',
      title: 'Create a Game',
      description: 'Choose a game type and configure your questions or prompts.',
    },
    {
      step: '2',
      title: 'Go Live',
      description: 'Start a session and share the play link with your audience.',
    },
    {
      step: '3',
      title: 'See Results',
      description: 'Watch real-time results on your OBS overlay as viewers participate.',
    },
  ];
</script>

<svelte:head>
  <title>Twitch Hub - Interactive Games for Streamers</title>
</svelte:head>

<!-- Hero -->
<section class="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
  <div class="animate-fade-in">
    <h1 class="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
      <span class="bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-transparent">
        Interactive Games
      </span>
      <br />
      for Your Stream
    </h1>
    <p class="mx-auto mb-10 max-w-2xl text-lg text-text-secondary sm:text-xl">
      Run polls, brackets, quizzes, and more with real-time audience participation via Twitch chat
      and web UI.
    </p>
    <Button href="/auth/login" size="lg">
      <TwitchIcon size={20} />
      Get Started
    </Button>
  </div>
</section>

<!-- Game Types -->
<section class="mx-auto max-w-5xl px-4 pb-16">
  <h2 class="mb-8 text-center text-2xl font-bold text-text-primary">Game Types</h2>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each allTypes as game (game.value)}
      <Card padding="lg" class="relative {game.available ? '' : 'opacity-60'}">
        <div class="mb-3 flex items-center gap-2">
          {#if game.value === GameType.HOT_TAKE}
            <FireIcon size={20} class="text-brand-400" />
          {/if}
          <h3 class="text-lg font-semibold text-text-primary">{game.label}</h3>
        </div>
        <p class="text-sm text-text-secondary">{game.description}</p>
        {#if !game.available}
          <span
            class="absolute right-3 top-3 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted"
          >
            Coming Soon
          </span>
        {/if}
      </Card>
    {/each}
  </div>
</section>

<!-- How It Works -->
<section class="border-t border-border-subtle bg-surface-secondary/50 px-4 py-16">
  <div class="mx-auto max-w-4xl">
    <h2 class="mb-10 text-center text-2xl font-bold text-text-primary">How It Works</h2>
    <div class="grid gap-8 sm:grid-cols-3">
      {#each steps as step (step.step)}
        <div class="text-center">
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/20 text-xl font-bold text-brand-400"
          >
            {step.step}
          </div>
          <h3 class="mb-2 text-lg font-semibold text-text-primary">{step.title}</h3>
          <p class="text-sm text-text-secondary">{step.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Final CTA -->
<section class="px-4 py-16 text-center">
  <h2 class="mb-4 text-2xl font-bold text-text-primary">Ready to engage your audience?</h2>
  <p class="mb-8 text-text-secondary">Set up your first game in minutes.</p>
  <Button href="/auth/login" size="lg">
    <TwitchIcon size={20} />
    Get Started Free
  </Button>
</section>
