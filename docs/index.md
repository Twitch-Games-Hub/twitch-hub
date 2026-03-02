---
layout: home
hero:
  name: Twitch Hub
  text: Interactive Games for Twitch Streamers
  tagline: Run polls, quizzes, brackets, and more — powered by chat commands and real-time overlays.
  actions:
    - theme: brand
      text: Get Started
      link: /dev/getting-started
    - theme: alt
      text: Streamer Guide
      link: /guide/streamer-setup
    - theme: alt
      text: Game Types
      link: /games/hot-take

features:
  - title: 4 Game Types
    details: Hot Take, Balance, Blind Test, and Ranking — each with unique mechanics and overlays.
  - title: Real-Time Overlays
    details: Add a browser source to OBS and see votes update live with histograms, split bars, leaderboards, and brackets.
  - title: Chat Integration
    details: Viewers participate via Twitch chat commands (!rate, !vote, !answer, !pick) — no account required.
  - title: Built for Scale
    details: Redis vote aggregation, throttled broadcasts, and deduplication handle thousands of concurrent viewers.
---

## What is Twitch Hub?

Twitch Hub is an open-source platform for running interactive games on your Twitch stream. Streamers create games through a web dashboard, viewers play via chat commands or a browser `/play` link, and results stream in real time to an OBS overlay. A built-in gamification system awards XP, levels, loyalty tiers, and achievements to keep viewers coming back.

## Game Types

| Game                            | Description                                                                     | Chat Command          | Overlay                   |
| ------------------------------- | ------------------------------------------------------------------------------- | --------------------- | ------------------------- |
| [Hot Take](/games/hot-take)     | Rate a statement 1–10; see the audience histogram                               | `!rate N`             | Histogram (10-bar chart)  |
| [Balance](/games/balance)       | Vote A or B on a dilemma; watch the tug-of-war bar shift                        | `!vote A` / `!vote B` | Tug of War (animated %)   |
| [Blind Test](/games/blind-test) | Guess the answer to a question; scored by speed and accuracy                    | `!answer text`        | Leaderboard (top scorers) |
| [Ranking](/guide/ranking-game)  | Elimination bracket — vote on head-to-head matchups until a champion is crowned | `!pick A` / `!pick B` | Bracket (tournament tree) |

## How It Works

1. **Log in with Twitch** — authenticate via the web dashboard.
2. **Create a game** — pick a type, add your questions/items, and configure round duration.
3. **Start a session** — the session moves through `LOBBY → LIVE → ENDED`.
4. **Viewers join** — they participate with [chat commands](/guide/chat-commands) or the browser `/play` link.
5. **Live results** — votes aggregate in Redis and stream to the [OBS overlay](/guide/overlay-setup) at up to 5 updates/sec.
6. **Review results** — after the session ends, players earn XP and [achievements](/gamification).

## Chat Commands

| Command               | Game Type  | Example         | Description                     |
| --------------------- | ---------- | --------------- | ------------------------------- |
| `!rate N`             | Hot Take   | `!rate 7`       | Rate the current statement 1–10 |
| `!vote A` / `!vote B` | Balance    | `!vote A`       | Vote for option A or B          |
| `!answer text`        | Blind Test | `!answer Mario` | Submit a guess                  |
| `!guess text`         | Blind Test | `!guess Zelda`  | Alias for `!answer`             |
| `!pick A` / `!pick B` | Ranking    | `!pick A`       | Vote for a matchup winner       |

Commands are case-insensitive, one vote per user per round. See the full [Chat Commands](/guide/chat-commands) reference.

## Overlays

Each game type renders a different real-time overlay for OBS. Add a **Browser Source** pointing at `/overlay/{sessionId}` with a transparent background.

| Game Type  | Overlay     | Description                                    |
| ---------- | ----------- | ---------------------------------------------- |
| Hot Take   | Histogram   | 10-bar chart showing rating distribution       |
| Balance    | Tug of War  | Animated A vs B percentage bar                 |
| Blind Test | Leaderboard | Top scorers ranked by speed and accuracy       |
| Ranking    | Bracket     | Elimination bracket with head-to-head matchups |

See [Overlay Setup](/guide/overlay-setup) for OBS configuration details.

## Player Progression

Twitch Hub tracks XP, levels, achievements, and channel loyalty across all game types. Progression is computed in Redis during gameplay and persisted to Postgres asynchronously — zero impact on vote latency.

- **Levels** — 1 to 50, based on total XP (`level = floor(sqrt(totalXp / 25))`)
- **Loyalty tiers** — per-channel progression: Newcomer → Regular → Dedicated → Superfan → Legendary
- **16 achievements** — participation, skill, social, and rare (hidden) categories

See the full [Gamification](/gamification) reference for XP tables, tier thresholds, and achievement details.

## Architecture at a Glance

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | SvelteKit 5, Tailwind CSS 4, Socket.IO client               |
| Backend  | Fastify, Socket.IO (3 namespaces), Prisma                   |
| Database | PostgreSQL (persistent), Redis (votes, dedup, leaderboards) |
| Chat     | Twitch EventSub WebSocket                                   |
| Tooling  | pnpm workspaces, TypeScript, tsup                           |

**Data flow:** Twitch Chat → EventSub → chatParser → GameEngine → Redis → throttled broadcast → overlays, dashboard, and play clients.

See [Architecture](/dev/architecture), [REST API](/api/rest), [Socket Events](/api/socket-events), and [Shared Types](/api/shared-types).

## Getting Started

**Streamers** — follow the [Streamer Setup](/guide/streamer-setup) guide to create your first game.

**Developers** — see [Getting Started](/dev/getting-started) for full setup instructions, or quick-start:

```bash
git clone https://github.com/your-org/twitch-hub.git && cd twitch-hub
cp .env.example apps/server/.env  # add your Twitch credentials
./scripts/dev-init.sh             # Docker, deps, DB, tmux session
```

## Deployment

Twitch Hub deploys to a VPS with Docker Compose and automatic HTTPS via Caddy. An interactive wizard handles server creation, provisioning, and deployment in one command. CI/CD via GitHub Actions automatically publishes Docker images and triggers rolling upgrades with auto-rollback.

See the full [Deployment](/deployment) guide.
