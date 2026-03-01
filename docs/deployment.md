# Production Deployment

Deploy Twitch Hub to a VPS with Docker and automatic HTTPS via Caddy.

## Architecture

```
Internet
  │
  ├─ example.com ──────→ Caddy ──→ web:3000  (SvelteKit)
  └─ api.example.com ──→ Caddy ──→ server:3001  (Fastify + Socket.IO)
```

Caddy handles TLS certificates automatically via Let's Encrypt.

## Prerequisites

- VPS with Docker and Docker Compose installed
- A domain with two DNS A records pointing to your server:
  - `example.com` → server IP
  - `api.example.com` → server IP
- Twitch application credentials (create at [dev.twitch.tv](https://dev.twitch.tv/console))

## Setup

### 1. Clone and configure

```bash
git clone <repo-url> twitch-hub && cd twitch-hub
cp .env.production.example .env.production
```

### 2. Generate secrets

```bash
./scripts/deploy.sh secrets
```

Copy the output into `.env.production`.

### 3. Fill in remaining variables

Edit `.env.production`:

```bash
vim .env.production
```

Required fields:

- `APP_DOMAIN` / `API_DOMAIN` — your actual domain names
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — from Twitch Developer Console

### 4. Configure Twitch OAuth

In your Twitch application settings, set the OAuth redirect URL to:

```
https://YOUR_APP_DOMAIN/api/auth/callback
```

### 5. Deploy

```bash
./scripts/deploy.sh deploy
```

This will build images, start all services, run database migrations, and restart the server.

## Commands

| Command                           | Description                               |
| --------------------------------- | ----------------------------------------- |
| `./scripts/deploy.sh deploy`      | Full deployment (build + start + migrate) |
| `./scripts/deploy.sh build`       | Build Docker images                       |
| `./scripts/deploy.sh up`          | Start services                            |
| `./scripts/deploy.sh down`        | Stop services                             |
| `./scripts/deploy.sh migrate`     | Run Prisma migrations                     |
| `./scripts/deploy.sh restart`     | Rebuild and restart web + server only     |
| `./scripts/deploy.sh logs`        | Tail all logs                             |
| `./scripts/deploy.sh logs server` | Tail server logs                          |
| `./scripts/deploy.sh status`      | Show service status                       |
| `./scripts/deploy.sh secrets`     | Generate random secrets                   |

## Updating

```bash
git pull
./scripts/deploy.sh restart
# If there are new migrations:
./scripts/deploy.sh migrate
```

## Monitoring

```bash
# Service status
./scripts/deploy.sh status

# Live logs
./scripts/deploy.sh logs

# Single service
./scripts/deploy.sh logs server
```

## Backups

### Database

```bash
# Dump
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U twitch_hub twitch_hub > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U twitch_hub twitch_hub
```

### Volumes

Persistent data is stored in Docker volumes: `pgdata`, `redisdata`, `caddy_data`, `caddy_config`.
