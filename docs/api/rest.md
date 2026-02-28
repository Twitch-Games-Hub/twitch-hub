# REST API

Base URL: `http://localhost:3001/api`

All game endpoints require authentication via `Authorization: Bearer <token>` header.

## Auth

### `POST /api/auth/upsert`

Upsert a user from Twitch OAuth data. Returns JWT token.

**Request body:**

```json
{
  "twitchId": "123456",
  "twitchLogin": "streamer",
  "displayName": "Streamer",
  "profileImageUrl": "https://...",
  "accessToken": "...",
  "refreshToken": "...",
  "tokenExpiresAt": "2025-01-01T00:00:00Z"
}
```

**Response:**

```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "cuid...",
    "twitchId": "123456",
    "twitchLogin": "streamer",
    "displayName": "Streamer",
    "profileImageUrl": "https://...",
    "role": "STREAMER"
  }
}
```

### `GET /api/auth/me`

Get the current authenticated user.

**Response:** `ApiUser` object (see [Shared Types](./shared-types))

## Games

All endpoints require authentication.

### `GET /api/games`

List all games owned by the authenticated user.

**Response:** `ApiGame[]` with nested `sessions` array.

### `GET /api/games/:gameId`

Get a single game with its sessions.

**Response:** `ApiGame` with `sessions` array, or `404`.

### `POST /api/games`

Create a new game.

**Request body:**

```json
{
  "type": "HOT_TAKE",
  "title": "Hot Takes Episode 1",
  "config": {
    "statements": ["Pineapple on pizza is great"],
    "roundDurationSec": 30
  }
}
```

**Response:** `201` with created `ApiGame`.

### `PUT /api/games/:gameId`

Update a game's title, config, or status.

**Request body:** Any combination of `title`, `config`, `status`.

**Response:** Updated `ApiGame`.

### `DELETE /api/games/:gameId`

Delete a game and all its sessions.

**Response:** `{ "success": true }`

## Health

### `GET /health`

No authentication required.

**Response:** `{ "status": "ok" }`
