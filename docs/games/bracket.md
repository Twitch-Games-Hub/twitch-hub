# Bracket

Tournament-style bracket with progressive matchups voted on by the audience.

## How It Works

1. Streamer creates a bracket with items and a bracket size (8, 16, or 32)
2. Items are matched up in pairs
3. Each round, viewers vote A or B for the current matchup
4. Winners advance to the next round
5. Continues until a champion is decided

## Config

```ts
interface BracketConfig {
  items: string[]; // Items in the bracket
  bracketSize: 8 | 16 | 32; // Must be power of 2
}
```

## Chat Command

```
!vote A
!vote B
```

Same command as Balance — context determines the matchup.

## Overlay

The **BracketTree** component visualizes the full bracket with completed and upcoming matchups.
