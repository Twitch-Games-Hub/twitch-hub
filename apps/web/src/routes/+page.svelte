<script lang="ts">
  import { GameType } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { TwitchIcon, FireIcon } from '$lib/components/ui/icons';

  const gameEmojis: Record<string, string> = {
    fire: '🔥',
    balance: '⚖️',
    tier: '📊',
    blind: '🎯',
  };

  const allTypes = Object.values(GameType).map((value) => ({
    value,
    ...GAME_TYPE_META[value],
  }));

  const steps = [
    { step: '1', title: 'Create', description: 'Pick a game type & set up your prompts.' },
    { step: '2', title: 'Go Live', description: 'Share the link — viewers join instantly.' },
    { step: '3', title: 'Watch', description: 'Real-time results right in your OBS overlay.' },
  ];
</script>

<svelte:head>
  <title>Twitch Hub - Interactive Games for Streamers</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4">
  <!-- Hero -->
  <section class="relative py-10 text-center sm:py-16">
    <div
      class="pointer-events-none absolute inset-0 -top-10 mx-auto h-64 w-64 rounded-full bg-brand-500/15 blur-[100px] sm:h-80 sm:w-80"
    ></div>
    <div class="animate-fade-in relative">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        <span class="bg-gradient-to-r from-brand-400 to-brand-200 bg-clip-text text-transparent">
          Engage Your Chat
        </span>
        <br />
        Like Never Before
      </h1>
      <p class="mx-auto mb-8 max-w-xl text-lg text-text-secondary">
        Polls, brackets, quizzes & more — real-time audience games that run inside your stream.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <Button href="/auth/login" size="lg">
          <TwitchIcon size={20} />
          Get Started
        </Button>
        <Button href="/explore" size="lg" variant="secondary">Explore Games</Button>
      </div>
    </div>
  </section>

  <!-- Game Types -->
  <section class="pb-12 pt-4">
    <h2 class="mb-6 text-center text-2xl font-bold text-text-primary">Game Types</h2>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each allTypes as game (game.value)}
        <Card
          padding="lg"
          class="relative transition-all duration-200 hover:scale-[1.02] hover:border-brand-500/40 hover:shadow-[0_0_20px_rgba(var(--color-brand-500),0.1)] {game.available
            ? ''
            : 'opacity-60'}"
        >
          <div class="mb-2 flex items-center gap-2.5">
            <span class="text-2xl" role="img">{gameEmojis[game.icon] ?? '🎮'}</span>
            <h3 class="text-lg font-semibold text-text-primary">{game.label}</h3>
          </div>
          <p class="text-sm leading-relaxed text-text-secondary">{game.description}</p>
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
  <section class="pb-14 pt-2">
    <h2 class="mb-6 text-center text-xl font-bold text-text-primary">How It Works</h2>
    <div class="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-0">
      <!-- Connecting line (desktop only) -->
      <div
        class="absolute top-6 hidden h-px w-full bg-gradient-to-r from-transparent via-border-subtle to-transparent sm:block"
      ></div>

      {#each steps as step, i (step.step)}
        <div class="relative z-10 flex flex-col items-center text-center sm:flex-1">
          <div
            class="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/30 bg-surface-primary text-lg font-bold text-brand-400"
          >
            {step.step}
          </div>
          <h3 class="mb-1 text-sm font-semibold text-text-primary">{step.title}</h3>
          <p class="max-w-[180px] text-xs text-text-secondary">{step.description}</p>
        </div>
        {#if i < steps.length - 1}
          <span class="hidden text-text-muted sm:block">→</span>
        {/if}
      {/each}
    </div>
  </section>
</div>
