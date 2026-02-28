# Architecture

## Monorepo Structure

```
twitch-hub/
├── apps/
│   ├── web/          # SvelteKit 5 frontend
│   └── server/       # Express + Socket.IO backend
├── packages/
│   └── shared-types/ # TypeScript types shared between apps
└── docs/             # VitePress documentation
```

**Tooling**: Bun workspaces manage dependencies and orchestrate builds/scripts across packages.

## Data Flow

```
Twitch Chat ──→ EventSub WebSocket ──→ chatParser ──→ GameEngine.onAnswer()
                                                          │
Browser ──→ Socket.IO /play ──→ voteHandler ──→ GameEngine.onAnswer()
                                                          │
                                          ┌───────────────┘
                                          ▼
                                    Redis (votes)
                                          │
                              Throttled broadcast (5/sec)
                                          │
                    ┌─────────────────────┼──────────────────┐
                    ▼                     ▼                  ▼
             /dashboard            /play clients       /overlay (OBS)
```

## Server Architecture

- **Express** handles REST API (auth, game CRUD)
- **Socket.IO** runs 3 namespaces:
  - `/dashboard` — Authenticated streamer control (start/stop/next round)
  - `/play` — Public participation (submit responses)
  - `/overlay` — Public read-only (live vote aggregation for OBS)
- **GameEngine** — Abstract base class extended by 6 game types
- **GameRegistry** — Maps game types to engine instances per session
- **Redis** — Vote aggregation (HINCRBY), deduplication (SADD), leaderboards (sorted sets)

## Client Architecture

- **SvelteKit 5** with runes (`$state`, `$derived`, `$effect`)
- **Socket.IO client** singleton factory per namespace
- **Svelte stores** (`.svelte.ts` modules) for auth and game state
- **SvelteKit API routes** proxy auth/game requests to the server
- **Tailwind CSS 4** via Vite plugin

## Database

PostgreSQL via Prisma with these models:

| Model         | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `User`        | Twitch-authenticated streamers                       |
| `Game`        | Game configurations (type, title, config JSON)       |
| `GameSession` | Live session state (status, current round)           |
| `Response`    | Individual viewer responses (deduplicated per round) |
