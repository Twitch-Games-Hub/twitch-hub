# Socket.IO Events

The server exposes 3 Socket.IO namespaces, all on port `3001`.

## Namespaces

| Namespace    | Auth Required | Purpose               |
| ------------ | ------------- | --------------------- |
| `/dashboard` | Yes (JWT)     | Streamer game control |
| `/play`      | No            | Viewer participation  |
| `/overlay`   | No            | OBS browser source    |

## Client → Server Events

| Event                 | Namespace           | Payload                             | Description                     |
| --------------------- | ------------------- | ----------------------------------- | ------------------------------- |
| `game:create-session` | `/dashboard`        | `gameId: string`                    | Create a new session for a game |
| `game:start`          | `/dashboard`        | `sessionId: string`                 | Start the session               |
| `game:next-round`     | `/dashboard`        | `sessionId: string`                 | Advance to next round           |
| `game:end`            | `/dashboard`        | `sessionId: string`                 | End the session                 |
| `response:submit`     | `/play`             | `{ sessionId, questionId, answer }` | Submit a response               |
| `session:join`        | `/play`, `/overlay` | `sessionId: string`                 | Join a session room             |

## Server → Client Events

| Event                | Payload           | Description                             |
| -------------------- | ----------------- | --------------------------------------- |
| `game:state`         | `GameState`       | Full game state update                  |
| `game:round-start`   | `RoundData`       | New round started with prompt/options   |
| `game:round-end`     | `RoundResults`    | Round results with distribution         |
| `game:ended`         | `FinalResults`    | Session completed with all results      |
| `votes:update`       | `VoteAggregation` | Live vote aggregation (throttled 5/sec) |
| `participants:count` | `number`          | Current participant count               |
| `session:created`    | `{ sessionId }`   | Session created successfully            |
| `error`              | `string`          | Error message                           |

## Connection Example

```ts
import { io } from 'socket.io-client';

// Overlay (no auth)
const overlay = io('http://localhost:3001/overlay');
overlay.emit('session:join', 'session-id');
overlay.on('votes:update', (data) => {
  console.log(data.distribution, data.totalVotes);
});

// Dashboard (with auth)
const dashboard = io('http://localhost:3001/dashboard', {
  auth: { token: 'jwt-token-here' },
});
```
