# Getting Started

## Prerequisites

| Tool    | Version                |
| ------- | ---------------------- |
| Node.js | >= 22                  |
| Bun     | >= 1.x                 |
| Docker  | For PostgreSQL + Redis |
| tmux    | Terminal multiplexer   |

## Quick Start

The `dev-init.sh` script handles everything — Docker, dependencies, database migrations, and launches a tmux session with all services:

```bash
# Clone
git clone https://github.com/your-org/twitch-hub.git
cd twitch-hub

# Configure environment
cp apps/server/.env.example apps/server/.env
# Edit .env with your Twitch app credentials

# Full setup + launch
./scripts/dev-init.sh
```

This opens a tmux session (`twitch-hub`) with three panes:

```
┌─────────────────────────────────┐
│         bun dev (65%)           │
│   (SvelteKit :5173 + Server    │
│         :3001)                  │
├────────────────┬────────────────┤
│ docker compose │ stripe listen  │
│ logs (35%)     │ (or info msg)  │
└────────────────┴────────────────┘
```

| Pane         | Content                                                                |
| ------------ | ---------------------------------------------------------------------- |
| Top          | `bun dev` — SvelteKit (`:5173`) + Express server (`:3001`)             |
| Bottom-left  | `docker compose logs -f` — PostgreSQL and Redis output                 |
| Bottom-right | Stripe webhook listener, or a placeholder if Stripe CLI is unavailable |

### `dev-init.sh` Commands

| Command                         | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| `./scripts/dev-init.sh`         | Full setup: prereqs, Docker, install, migrate, tmux |
| `./scripts/dev-init.sh init`    | Same as above (explicit)                            |
| `./scripts/dev-init.sh reset`   | Nuke volumes + node_modules, then full init         |
| `./scripts/dev-init.sh restart` | Restart Docker + tmux session (skip `bun install`)  |
| `./scripts/dev-init.sh stop`    | Kill tmux session and stop Docker containers        |
| `./scripts/dev-init.sh stripe`  | Start Stripe webhook listener standalone (no tmux)  |

## Dev URLs

| Service      | URL                            |
| ------------ | ------------------------------ |
| Web app      | `http://localhost:5173`        |
| Server API   | `http://localhost:3001`        |
| Health check | `http://localhost:3001/health` |

## Environment Variables

Create a `.env` file in `apps/server/` (see `.env.example`):

| Variable               | Description                      | Default                                                        |
| ---------------------- | -------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string     | `postgresql://twitch_hub:twitch_hub@localhost:5432/twitch_hub` |
| `REDIS_URL`            | Redis connection string          | `redis://localhost:6379`                                       |
| `JWT_SECRET`           | Secret for JWT signing           | `dev-secret`                                                   |
| `TWITCH_CLIENT_ID`     | Twitch application client ID     | —                                                              |
| `TWITCH_CLIENT_SECRET` | Twitch application client secret | —                                                              |
| `TWITCH_REDIRECT_URI`  | OAuth callback URL               | `http://localhost:5173/api/auth/callback`                      |
| `PUBLIC_APP_URL`       | Frontend origin                  | `http://localhost:5173`                                        |

## Scripts

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `bun run dev`       | Start all services in dev mode |
| `bun run build`     | Build all packages             |
| `bun run lint`      | Run ESLint across workspaces   |
| `bun run format`    | Format code with Prettier      |
| `bun run typecheck` | Run TypeScript type checking   |
| `bun run test`      | Run unit tests                 |
| `bun run docs:dev`  | Start documentation dev server |
