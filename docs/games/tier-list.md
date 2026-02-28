# Tier List

Collaborative tier list where viewers place items into tiers via chat.

## How It Works

1. Streamer creates a list of items and available tiers
2. Each item is presented one at a time
3. Viewers place items into tiers (S, A, B, C, D, F)
4. The most-voted tier for each item wins
5. Final tier list is assembled from all placements

## Config

```ts
interface TierListConfig {
  items: string[]; // Items to tier
  tiers: string[]; // Available tiers (e.g., ['S', 'A', 'B', 'C', 'D', 'F'])
}
```

## Chat Command

```
!tier T itemname
```

Where `T` is one of: `S`, `A`, `B`, `C`, `D`, `F`

Examples: `!tier S Minecraft`, `!tier B Fortnite`

## Overlay

Items are displayed in their assigned tiers, updating live as votes come in.
