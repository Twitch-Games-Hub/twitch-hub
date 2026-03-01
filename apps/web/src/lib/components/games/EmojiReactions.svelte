<script lang="ts">
  export interface FloatingEmoji {
    id: number;
    emoji: string;
    x: number; // % offset from center, -40 to +40
  }

  const EMOJIS = ['👏', '🔥', '😮', '😂', '💯', '🎉'];

  let {
    onReact,
    floatingEmojis,
  }: { onReact: (emoji: string) => void; floatingEmojis: FloatingEmoji[] } = $props();

  let lastSentAt = 0;
  const COOLDOWN_MS = 1500;

  function handleReact(emoji: string) {
    const now = Date.now();
    if (now - lastSentAt < COOLDOWN_MS) return;
    lastSentAt = now;
    onReact(emoji);
  }
</script>

<!-- Emoji reaction bar -->
<div class="flex items-center justify-center gap-2">
  {#each EMOJIS as emoji (emoji)}
    <button
      type="button"
      onclick={() => handleReact(emoji)}
      class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-xl transition-transform duration-100 active:scale-90 hover:scale-110 hover:bg-surface-tertiary"
      aria-label="React with {emoji}"
    >
      {emoji}
    </button>
  {/each}
</div>

<!-- Floating emoji layer (fixed, full-screen, pointer-events-none) -->
<div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
  {#each floatingEmojis as fe (fe.id)}
    <span class="animate-emoji-rise absolute bottom-24 text-3xl" style="left: calc(50% + {fe.x}px)">
      {fe.emoji}
    </span>
  {/each}
</div>
