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

## Option A: Automated Hetzner Deployment (pyinfra)

One-command server creation, provisioning, and deployment using pyinfra.

### Prerequisites

- Python 3.10+
- A Hetzner Cloud account with an API token
- An SSH key pair (ed25519 recommended)
- DNS records ready to point at the new server

### Quick start

```bash
cd infra
pip install -e .          # or: uv pip install -e .

python run.py secrets     # generate passwords → .env.infra
vim .env.infra            # fill in HCLOUD_TOKEN, domains, Twitch creds

python run.py full        # create server → provision → deploy
```

### Individual commands

```bash
python run.py create      # create Hetzner VPS only
python run.py provision   # provision server (Docker, firewall, SSH hardening)
python run.py deploy      # deploy app (clone, env, docker compose up)
python run.py secrets     # generate secrets into .env.infra
```

### What provisioning does

1. Creates 2GB swap (for small VPS instances)
2. Configures UFW firewall (ports 22, 80, 443 only)
3. Installs Docker Engine + Compose plugin
4. Creates a `deploy` user with Docker access
5. Hardens SSH (key-only auth, root login disabled)

### Configuration

All config lives in `infra/.env.infra` (gitignored). Required fields:

| Variable               | Description                          |
| ---------------------- | ------------------------------------ |
| `HCLOUD_TOKEN`         | Hetzner Cloud API token              |
| `APP_DOMAIN`           | Main app domain (e.g. `example.com`) |
| `API_DOMAIN`           | API domain (e.g. `api.example.com`)  |
| `GIT_REPO_URL`         | Git repository URL                   |
| `TWITCH_CLIENT_ID`     | Twitch app client ID                 |
| `TWITCH_CLIENT_SECRET` | Twitch app client secret             |

Optional overrides: `HCLOUD_SERVER_TYPE` (default: cx22), `HCLOUD_LOCATION` (default: nbg1), `SSH_PUBLIC_KEY_PATH`, `DEPLOY_USER` (default: deploy), `GIT_BRANCH` (default: main).

---

## Option B: Manual VPS Deployment

### Prerequisites

- VPS with Docker and Docker Compose installed
- A domain with two DNS A records pointing to your server:
  - `example.com` → server IP
  - `api.example.com` → server IP
- Twitch application credentials (create at [dev.twitch.tv](https://dev.twitch.tv/console))

### Setup

#### 1. Clone and configure

```bash
git clone <repo-url> twitch-hub && cd twitch-hub
cp .env.production.example .env.production
```

#### 2. Generate secrets

```bash
./scripts/deploy.sh secrets
```

Copy the output into `.env.production`.

#### 3. Fill in remaining variables

Edit `.env.production`:

```bash
vim .env.production
```

Required fields:

- `APP_DOMAIN` / `API_DOMAIN` — your actual domain names
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — from Twitch Developer Console

#### 4. Configure Twitch OAuth

In your Twitch application settings, set the OAuth redirect URL to:

```
https://YOUR_APP_DOMAIN/api/auth/callback
```

#### 5. Deploy

```bash
./scripts/deploy.sh deploy
```

This will build images, start all services, wait for healthy databases, run migrations, and restart the server.

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
