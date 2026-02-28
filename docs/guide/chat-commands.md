# Chat Commands

Viewers interact with games by typing commands in Twitch chat. No account or login is required.

## Command Reference

| Command               | Game Type  | Example         | Description                     |
| --------------------- | ---------- | --------------- | ------------------------------- |
| `!rate N`             | Hot Take   | `!rate 7`       | Rate the current statement 1-10 |
| `!vote A` / `!vote B` | Balance    | `!vote A`       | Vote for option A or B          |
| `!answer text`        | Blind Test | `!answer Mario` | Submit a guess                  |
| `!guess text`         | Blind Test | `!guess Zelda`  | Alias for `!answer`             |

## How It Works

1. The server connects to Twitch via EventSub WebSocket
2. Chat messages are received in real-time
3. `chatParser.ts` extracts commands from messages
4. Valid commands are routed to the active game engine
5. Votes are deduplicated per user per round (one vote per person)
6. Results are aggregated in Redis and broadcast to overlays

## Rules

- Commands are **case-insensitive** (`!RATE 5` = `!rate 5`)
- Extra whitespace is trimmed
- Only one vote per user per round is counted
- Invalid values are silently ignored (e.g., `!rate 15`)
- Commands only work when a session is in `ACTIVE` status
