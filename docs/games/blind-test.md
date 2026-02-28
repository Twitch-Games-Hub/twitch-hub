# Blind Test

Timed guessing game with hints. Fastest correct answer scores the most points.

## How It Works

1. Streamer creates rounds with answers, hints, and optional media
2. Each round reveals hints progressively
3. Viewers submit guesses via chat
4. Correct guesses score points (faster = more points)
5. A leaderboard tracks cumulative scores across rounds

## Config

```ts
interface BlindTestConfig {
  rounds: {
    answer: string; // Correct answer
    hints: string[]; // Progressive hints
    mediaSrc?: string; // Optional media (image/audio URL)
  }[];
  answerWindowSec: number; // Seconds allowed for guessing
}
```

## Chat Commands

```
!answer text
!guess text
```

Both commands are equivalent. Examples: `!answer Super Mario`, `!guess Zelda`

## Overlay

The **Leaderboard** component shows top scorers ranked by cumulative points. Updates after each correct answer.

## Scoring

Points are awarded based on speed — the first correct answer gets the most points, with decreasing points for subsequent correct guesses.
