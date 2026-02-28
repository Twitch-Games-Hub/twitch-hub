# Overlay Setup

## Adding to OBS

1. In OBS, add a **Browser Source**
2. Set the URL to: `http://localhost:5173/overlay/{sessionId}`
3. Set dimensions: **Width** 800, **Height** 600 (adjust as needed)
4. Check **Shutdown source when not visible** for clean reconnections

## Overlay Features

Each game type renders a different overlay visualization:

| Game Type  | Overlay Component | Description                                     |
| ---------- | ----------------- | ----------------------------------------------- |
| Hot Take   | Histogram         | 10-bar chart showing rating distribution (1-10) |
| Balance    | Tug of War        | Animated A vs B percentage bar                  |
| Blind Test | Leaderboard       | Top scorers ranked by speed and accuracy        |

## Transparency

The overlay pages use a transparent background. In OBS browser source properties, the background will be transparent by default, allowing the overlay to sit on top of your stream.

## Live Updates

Overlays connect via Socket.IO `/overlay` namespace and receive:

- `votes:update` — Real-time vote aggregation (throttled to 5 updates/sec)
- `participants:count` — Current participant count
- `game:round-start` — New round data
- `game:round-end` — Round results
- `game:ended` — Final results
