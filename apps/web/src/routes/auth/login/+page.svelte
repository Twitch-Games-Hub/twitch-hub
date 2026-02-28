<svelte:head>
  <title>Login - Twitch Hub</title>
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center">
  <div class="text-center">
    <h1 class="mb-4 text-3xl font-bold">Connect Your Twitch Account</h1>
    <p class="mb-8 text-gray-400">Log in with Twitch to create and manage interactive games for your stream.</p>
    <a
      href="/api/auth/twitch"
      class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-lg font-medium text-white hover:bg-purple-700"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
      Connect with Twitch
    </a>
  </div>
</div>
