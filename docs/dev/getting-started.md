# Getting Started

## Prerequisites

| Tool    | Version                |
| ------- | ---------------------- |
| Node.js | >= 22                  |
| Bun     | >= 1.x                 |
| Docker  | For PostgreSQL + Redis |

## Setup

```bash
# Clone
git clone https://github.com/your-org/twitch-hub.git
cd twitch-hub

# Install
bun install

# Start Postgres + Redis
docker compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your Twitch app credentials

# Generate Prisma client & run migrations
bun run --filter @twitch-hub/server db:generate
bun run --filter @twitch-hub/server db:migrate

# Start dev servers
bun run dev
```

## Dev URLs

| Service      | URL                            |
| ------------ | ------------------------------ |
| Web app      | `http://localhost:5173`        |
| Server API   | `http://localhost:3001`        |
| Health check | `http://localhost:3001/health` |

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

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
