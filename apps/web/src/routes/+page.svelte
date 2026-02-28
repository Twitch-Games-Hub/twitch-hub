<svelte:head>
  <title>Twitch Hub - Interactive Games for Streamers</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-20 text-center">
  <h1 class="mb-6 text-5xl font-bold tracking-tight">
    <span class="text-purple-400">Interactive Games</span> for Your Stream
  </h1>
  <p class="mb-10 text-xl text-gray-400">
    Run polls, brackets, quizzes, and more with real-time audience participation via Twitch chat and web UI.
  </p>

  <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each gameTypes as game}
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-6 text-left">
        <h3 class="mb-2 text-lg font-semibold text-white">{game.title}</h3>
        <p class="text-sm text-gray-400">{game.description}</p>
      </div>
    {/each}
  </div>

  <a
    href="/auth/login"
    class="mt-12 inline-block rounded-lg bg-purple-600 px-8 py-3 text-lg font-medium text-white hover:bg-purple-700"
  >
    Get Started
  </a>
</div>

<script lang="ts">
  const gameTypes = [
    { title: 'Hot Take Meter', description: 'Rate statements 1-10 and see the audience histogram live.' },
    { title: 'Balance Game', description: 'Would you rather? Compare streamer vs audience picks.' },
    { title: 'World Cup Bracket', description: 'Elimination bracket voted on by the audience.' },
    { title: 'Personality Quiz', description: 'Multi-question quiz revealing personality types.' },
    { title: 'Tier List', description: 'Community-built tier lists with consensus rankings.' },
    { title: 'Blind Test', description: 'Guess the answer with timed hints and leaderboards.' },
  ];
</script>
