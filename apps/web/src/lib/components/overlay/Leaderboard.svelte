<script lang="ts">
  import { fly } from 'svelte/transition';
  import { SvelteMap } from 'svelte/reactivity';
  import { renderInsignia } from '$lib/canvas';

  interface Entry {
    userId: string;
    score: number;
  }

  let { entries, title }: { entries: Entry[]; title: string } = $props();

  const RANK_MAP: Record<number, 'gold' | 'silver' | 'bronze'> = {
    0: 'gold',
    1: 'silver',
    2: 'bronze',
  };

  // Pre-render insignia data URLs for top 3 positions
  const insigniaUrls: Record<number, string> = $derived.by(() => {
    const urls: Record<number, string> = {};
    for (const [index, rank] of Object.entries(RANK_MAP)) {
      urls[Number(index)] = renderInsignia(rank);
    }
    return urls;
  });

  function isMedalPosition(index: number): boolean {
    return index < 3;
  }

  // Track previous positions for rank-change arrows
  let prevPositions = new SvelteMap<string, number>();
  let prevScores = new SvelteMap<string, number>();

  function getRankDelta(userId: string, currentIndex: number): number {
    const prev = prevPositions.get(userId);
    if (prev === undefined) return 0;
    return prev - currentIndex; // positive = moved up
  }

  function hasScoreChanged(userId: string, score: number): boolean {
    const prev = prevScores.get(userId);
    return prev !== undefined && prev !== score;
  }

  // Update previous positions after render
  $effect(() => {
    const newPositions = new SvelteMap<string, number>();
    const newScores = new SvelteMap<string, number>();
    for (let i = 0; i < entries.length; i++) {
      newPositions.set(entries[i].userId, i);
      newScores.set(entries[i].userId, entries[i].score);
    }
    // Defer update so current render uses old positions
    queueMicrotask(() => {
      prevPositions = newPositions;
      prevScores = newScores;
    });
  });
</script>

<div class="leaderboard-container">
  <div class="leaderboard-background">
    <div class="leaderboard-header">
      <h2 class="leaderboard-title">{title}</h2>
    </div>

    <div class="leaderboard-content">
      {#each entries as entry, index (entry.userId)}
        {@const rankDelta = getRankDelta(entry.userId, index)}
        {@const scoreChanged = hasScoreChanged(entry.userId, entry.score)}
        <div
          class="leaderboard-entry"
          class:medal-position={isMedalPosition(index)}
          in:fly={{ y: 20, duration: 300, delay: index * 80 }}
        >
          <div class="entry-rank">
            {#if isMedalPosition(index) && insigniaUrls[index]}
              <img
                src={insigniaUrls[index]}
                alt="{RANK_MAP[index]} rank"
                class="insignia"
                width="24"
                height="24"
              />
            {:else}
              <span class="rank-number">#{index + 1}</span>
            {/if}
          </div>

          <div class="entry-info">
            <div class="entry-userid">{entry.userId}</div>
          </div>

          <!-- Rank change arrow -->
          {#if rankDelta > 0}
            <span class="rank-arrow rank-up">▲</span>
          {:else if rankDelta < 0}
            <span class="rank-arrow rank-down">▼</span>
          {/if}

          <div class={`entry-score medal-${index}`} class:score-pop={scoreChanged}>
            {entry.score}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  :global(html) {
    color-scheme: dark;
  }

  .leaderboard-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .leaderboard-background {
    background: rgba(17, 24, 39, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    overflow: hidden;
    box-shadow:
      0 25px 50px rgba(0, 0, 0, 0.5),
      0 0 30px rgba(168, 85, 247, 0.3);
    border: 1px solid rgba(168, 85, 247, 0.2);
  }

  .leaderboard-header {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(88, 28, 135, 0.2) 100%);
    padding: 16px 20px;
    border-bottom: 2px solid rgba(168, 85, 247, 0.2);
  }

  .leaderboard-title {
    margin: 0;
    color: #c084fc;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .leaderboard-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 400px;
    overflow-y: auto;
  }

  .leaderboard-entry {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(31, 41, 55, 0.6);
    border-radius: 8px;
    transition: all 0.3s ease;
    border: 1px solid rgba(75, 85, 99, 0.3);
  }

  .leaderboard-entry.medal-position {
    background: rgba(31, 41, 55, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.4);
    position: relative;
    overflow: hidden;
  }

  .leaderboard-entry.medal-position::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgba(168, 85, 247, 0.08) 50%,
      transparent 60%
    );
    animation: shimmer-sweep 3s ease-in-out infinite;
    pointer-events: none;
  }

  .leaderboard-entry:hover {
    background: rgba(55, 65, 81, 0.8);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
  }

  .entry-rank {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    font-weight: 700;
  }

  .insignia {
    display: block;
    image-rendering: auto;
  }

  .rank-number {
    color: #9ca3af;
    font-size: 14px;
  }

  .entry-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .entry-userid {
    color: #e5e7eb;
    font-size: 14px;
    font-weight: 600;
    word-break: break-word;
  }

  .rank-arrow {
    font-size: 10px;
    font-weight: 700;
    animation: rank-arrow-bounce 0.4s ease-out;
  }

  .rank-up {
    color: #22c55e;
  }

  .rank-down {
    color: #ef4444;
  }

  .entry-score {
    font-size: 18px;
    font-weight: 700;
    min-width: 50px;
    text-align: right;
    transition: all 0.3s ease;
  }

  .entry-score.score-pop {
    animation: count-pop 0.3s ease-out;
  }

  .entry-score.medal-0 {
    background: linear-gradient(135deg, #facc15 0%, #d97706 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .entry-score.medal-1 {
    background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .entry-score.medal-2 {
    background: linear-gradient(135deg, #fb923c 0%, #d97706 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .entry-score {
    color: #a78bfa;
  }

  @media (max-width: 640px) {
    .leaderboard-container {
      max-width: 100%;
    }

    .entry-userid {
      font-size: 12px;
    }

    .entry-score {
      font-size: 16px;
    }
  }
</style>
