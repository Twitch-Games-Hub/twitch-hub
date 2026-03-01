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

---

## Quick Start: Interactive Wizard (Recommended)

The wizard guides you through the entire setup interactively:

```bash
cd infra
pip install -e .
python run.py wizard
```

The wizard will:

1. Check prerequisites (pyinfra, SSH key)
2. Collect your configuration (Hetzner token, domains, Twitch creds)
3. Generate secrets automatically
4. Create the Hetzner server
5. Guide DNS setup and verify propagation
6. Provision and deploy

---

## Option A: Automated Hetzner Deployment (pyinfra)

### Prerequisites

- Python 3.10+
- A Hetzner Cloud account with an API token
- An SSH key pair (ed25519 recommended)
- DNS records ready to point at the new server

### Step-by-step

```bash
cd infra
pip install -e .

python run.py preflight    # validate prerequisites and config
python run.py secrets      # generate passwords → .env.infra
vim .env.infra             # fill in HCLOUD_TOKEN, domains, Twitch creds

python run.py full         # create server → provision → deploy
```

### Individual commands

| Command                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| `python run.py wizard`    | Interactive first-time setup (recommended)    |
| `python run.py preflight` | Validate prerequisites, config, and SSH key   |
| `python run.py create`    | Create Hetzner VPS only                       |
| `python run.py provision` | Provision server (Docker, firewall, SSH)      |
| `python run.py deploy`    | Deploy app (clone, env, docker compose up)    |
| `python run.py full`      | create → provision → deploy (non-interactive) |
| `python run.py secrets`   | Generate secrets into .env.infra              |

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

Optional services: `SENTRY_DSN`, `PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

---

## Option B: Manual VPS Deployment

### Prerequisites

- VPS with Docker and Docker Compose installed
- A domain with two DNS A records pointing to your server
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

This will build images, start all services, run database setup (schema push + seed), and start the app.

---

## Deploy Script Commands

| Command                           | Description                                |
| --------------------------------- | ------------------------------------------ |
| `./scripts/deploy.sh deploy`      | Full deployment (build + start + db setup) |
| `./scripts/deploy.sh build`       | Build Docker images                        |
| `./scripts/deploy.sh up`          | Start services                             |
| `./scripts/deploy.sh down`        | Stop services                              |
| `./scripts/deploy.sh dbsetup`     | Push database schema and run seed          |
| `./scripts/deploy.sh seed`        | Run seed script independently              |
| `./scripts/deploy.sh restart`     | Rebuild and restart web + server only      |
| `./scripts/deploy.sh logs`        | Tail all logs                              |
| `./scripts/deploy.sh logs server` | Tail server logs                           |
| `./scripts/deploy.sh status`      | Show service status                        |
| `./scripts/deploy.sh secrets`     | Generate random secrets                    |

---

## Sentry Configuration

Twitch Hub supports Sentry for error tracking and structured logging on both server and web.

| Variable                    | Where           | Description                           |
| --------------------------- | --------------- | ------------------------------------- |
| `SENTRY_DSN`                | Server          | Server-side Sentry DSN                |
| `PUBLIC_SENTRY_DSN`         | Web (SvelteKit) | Client/server-side Sentry DSN         |
| `PUBLIC_SENTRY_ENVIRONMENT` | Web             | Environment tag (default: production) |

Both DSNs are optional — Sentry is disabled when the DSN is not set.

---

## Updating

```bash
git pull
./scripts/deploy.sh restart

# If schema changed:
./scripts/deploy.sh dbsetup
```

---

## Monitoring

```bash
# Service status
./scripts/deploy.sh status

# Live logs
./scripts/deploy.sh logs

# Single service
./scripts/deploy.sh logs server
```

---

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

---

## Troubleshooting

### DNS / TLS Issues

- Caddy needs DNS A records to resolve before it can issue TLS certificates
- Check DNS propagation: `dig +short your-domain.com`
- View Caddy logs: `./scripts/deploy.sh logs caddy`
- If certificates fail, restart Caddy after DNS propagates: `docker compose -f docker-compose.prod.yml restart caddy`

### Docker Issues

- Check container health: `./scripts/deploy.sh status`
- View container logs for a specific service: `./scripts/deploy.sh logs <service>`
- Rebuild from scratch: `./scripts/deploy.sh down && ./scripts/deploy.sh deploy`

### Database Issues

- Check postgres health: `./scripts/deploy.sh logs postgres`
- Re-run schema push + seed: `./scripts/deploy.sh dbsetup`
- Run seed independently: `./scripts/deploy.sh seed`
