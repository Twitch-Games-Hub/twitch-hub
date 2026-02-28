# Hot Take

Rate statements on a scale of 1-10. Results display as a real-time histogram.

## How It Works

1. Streamer creates a game with a list of statements
2. Each round displays one statement
3. Viewers rate it 1-10 via chat or web
4. A live histogram shows the distribution of ratings
5. Results are shown after each round

## Config

```ts
interface HotTakeConfig {
  statements: string[]; // List of statements to rate
  roundDurationSec: number; // Seconds per round
}
```

## Chat Command

```
!rate N    (where N is 1-10)
```

Examples: `!rate 1`, `!rate 10`, `!rate 7`

## Overlay

The **Histogram** component displays a 10-bar chart (one bar per rating 1-10). Bars animate in real-time as votes come in.

## Vote Storage

- Each rating maps to a Redis hash bucket (0-indexed): rating 1 → bucket 0, rating 10 → bucket 9
- Deduplication: one vote per user per round via Redis `SADD`
- Aggregation: `HINCRBY` increments the bucket count
