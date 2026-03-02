# Shared Types

The `@twitch-hub/shared-types` package defines all TypeScript types shared between the server and web app.

## Enums

### `GameType`

```ts
enum GameType {
  HOT_TAKE = 'HOT_TAKE',
  BALANCE = 'BALANCE',
  BLIND_TEST = 'BLIND_TEST',
  RANKING = 'RANKING',
}
```

### `GameStatus`

```ts
enum GameStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  ARCHIVED = 'ARCHIVED',
}
```

### `SessionStatus`

```ts
enum SessionStatus {
  LOBBY = 'LOBBY',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}
```

### `ResponseSource`

```ts
enum ResponseSource {
  WEB = 'WEB',
  CHAT = 'CHAT',
}
```

## Game Config Types

| Type              | Key Fields                                                                   |
| ----------------- | ---------------------------------------------------------------------------- |
| `HotTakeConfig`   | `statements: string[]`, `roundDurationSec: number`                           |
| `BalanceConfig`   | `questions: { optionA, optionB }[]`                                          |
| `BlindTestConfig` | `rounds: { answer, hints, mediaSrc? }[]`, `answerWindowSec: number`          |
| `RankingConfig`   | `items: RankingItem[]`, `bracketSize: 8\|16\|32`, `roundDurationSec: number` |

## API Types

| Type                | Description                                       |
| ------------------- | ------------------------------------------------- |
| `ApiUser`           | User profile (id, twitchId, displayName, role)    |
| `ApiGame`           | Game definition (id, type, title, config, status) |
| `ApiGameSession`    | Session state (id, gameId, status, currentRound)  |
| `CreateGameRequest` | Request body for creating games                   |
| `ApiError`          | Error response shape                              |

## Socket Event Types

| Type                   | Description                                 |
| ---------------------- | ------------------------------------------- |
| `GameState`            | Full game state snapshot                    |
| `RoundData`            | Current round info (prompt, options, timer) |
| `RoundResults`         | Round outcome (distribution, percentages)   |
| `FinalResults`         | Session summary with all rounds             |
| `VoteAggregation`      | Live vote counts for overlay                |
| `ClientToServerEvents` | Socket.IO client → server contract          |
| `ServerToClientEvents` | Socket.IO server → client contract          |
