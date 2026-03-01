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

### Resource Limits (cx23: 2 vCPU / 4 GB RAM)

| Service  | Memory | CPU  |
| -------- | ------ | ---- |
| postgres | 1 GB   | 1.0  |
| redis    | 256 MB | 0.5  |
| server   | 1 GB   | 1.5  |
| web      | 512 MB | 1.0  |
| caddy    | 128 MB | 0.25 |

---

## Quick Start: Interactive Wizard (Recommended)

The wizard guides you through the entire setup interactively with colored output, progress spinners, and confirmation prompts:

```bash
cd infra
uv sync           # install dependencies (including rich for UI)
uv run python run.py wizard
```

The wizard will:

1. Check prerequisites (pyinfra, ssh-keygen, rsync, SSH key)
2. Collect your configuration (Hetzner token, domains, Twitch creds) — secrets are masked during input
3. Generate secrets automatically (min 32 chars) and write `.env.infra` with mode 600
4. Create the Hetzner server (with confirmation prompt and config summary)
5. Guide DNS setup and **verify propagation** (hard stop on failure — no silent continuation)
6. Provision and deploy (with confirmation prompt)

### Resumability

The wizard saves progress to `.wizard_state.json`. If interrupted (Ctrl+C) or if a step fails:

```bash
# Resume from where you left off
uv run python run.py wizard

# Or start fresh
uv run python run.py wizard --fresh
```

---

## CI/CD Pipeline

GitHub Actions automatically builds and publishes Docker images on every push to `main`, but only after all CI checks pass.

### Pipeline

```
push to main
    │
    ├── lint ──────┐
    ├── typecheck ─┤                                                          ┌──→ deploy (SSH)
    ├── build ─────┼── all pass ──→ publish-server ──→ ghcr.io/…/server ──┤
    └── test ──────┘               publish-web    ──→ ghcr.io/…/web    ──┘
                                   (parallel)
```

- PRs run `lint`, `typecheck`, `build`, and `test` only — no images are published.
- Both publish jobs run in parallel once all four checks pass.
- Images are tagged `:latest` and `:<git-sha>` for every push.
- After both images are published, the `deploy` job automatically deploys to production via SSH.

### Image naming

GHCR requires fully lowercase image names. The pipeline lowercases the org name via:

```bash
echo "owner=${GITHUB_REPOSITORY_OWNER,,}" >> $GITHUB_OUTPUT
```

The `GHCR_SERVER_IMAGE` and `GHCR_WEB_IMAGE` values in `.env.production` must also be lowercase (handled automatically by the `| lower` filter in `infra/templates/env.production.j2`).

### Continuous Deployment

After CI publishes new Docker images, the `deploy` job SSHs into the production server and runs `/opt/twitch-hub/auto-upgrade.sh`. This script:

1. Captures current image digests for rollback
2. Backs up the database (fatal on failure)
3. Logs in to GHCR
4. Pulls the latest `server` and `web` images
5. Runs DB migration (`prisma db push` + seed)
6. Recreates `server` and `web` containers
7. Health checks both services (90s timeout)
8. Smoke tests API `/health` and web frontend

If any step from 5-8 fails, the script automatically rolls back: stops containers, restores the DB backup, re-tags the old images, and restarts.

#### Setup (one-time)

1. Generate a deploy SSH keypair:

   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/gh-actions-deploy -N ""
   ```

2. Add the public key to the server's deploy user:

   ```bash
   ssh deploy@<server-ip> 'cat >> ~/.ssh/authorized_keys' < ~/.ssh/gh-actions-deploy.pub
   ```

3. Add GitHub Secrets (repo Settings → Secrets → Actions):
   - `DEPLOY_SSH_KEY` — contents of `~/.ssh/gh-actions-deploy`
   - `SERVER_IP` — the VPS IP address

4. Run `python run.py deploy` to sync `auto-upgrade.sh` to the server.

**Optional hardening:** Restrict the deploy key to only run the upgrade script:

```
command="/opt/twitch-hub/auto-upgrade.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... github-actions-deploy
```

### Rolling back

To roll back to a previous image, pull the sha-tagged version and update your compose file:

```bash
# On the VPS
docker pull ghcr.io/<org>/twitch-hub-server:<sha>
docker pull ghcr.io/<org>/twitch-hub-web:<sha>

# Edit .env.production to pin the sha tags
GHCR_SERVER_IMAGE=ghcr.io/<org>/twitch-hub-server:<sha>
GHCR_WEB_IMAGE=ghcr.io/<org>/twitch-hub-web:<sha>

docker compose -f docker-compose.prod.yml up -d
```

---

## CLI Commands

| Command                           | Description                                               |
| --------------------------------- | --------------------------------------------------------- |
| `python run.py wizard`            | Interactive first-time setup (recommended)                |
| `python run.py wizard --fresh`    | Reset wizard state and start over                         |
| `python run.py preflight`         | Validate prerequisites, config, and SSH key               |
| `python run.py create`            | Create Hetzner VPS only                                   |
| `python run.py provision`         | Provision server (Docker, firewall, SSH)                  |
| `python run.py deploy`            | Deploy app (sync code, env template, compose)             |
| `python run.py deploy --dry-run`  | Show what would happen without executing                  |
| `python run.py upgrade`           | Pull new images, migrate DB, restart (with auto-rollback) |
| `python run.py upgrade --dry-run` | Show upgrade steps without executing                      |
| `python run.py full`              | create → provision → deploy (non-interactive)             |
| `python run.py secrets`           | Generate secrets into `.env.infra`                        |
| `python run.py health`            | Check running service status on the server                |

All commands use Rich for colored output, spinners, and formatted tables.

---

## Option A: Automated Hetzner Deployment (pyinfra)

### Prerequisites

- Python 3.10+ with [uv](https://docs.astral.sh/uv/)
- A Hetzner Cloud account with an API token
- An SSH key pair (ed25519 recommended)
- `rsync` installed locally
- DNS records ready to point at the new server

### Step-by-step

```bash
cd infra
uv sync

uv run python run.py preflight    # validate prerequisites and config
uv run python run.py secrets      # generate passwords → .env.infra
vim .env.infra                    # fill in HCLOUD_TOKEN, domains, Twitch creds

uv run python run.py full         # create server → provision → deploy
```

### What provisioning does

1. Creates 2GB swap (for small VPS instances)
2. Configures UFW firewall (ports 22, 80, 443 only) with `ufw --force enable`
3. Installs Docker Engine + Compose plugin
4. Creates a `deploy` user with Docker access
5. Validates SSH config with `sshd -t` before applying hardened settings

### What deployment does

1. Rsyncs project code to the server
2. Templates `.env.production` from config (validates all required keys have values)
3. Backs up the database before schema push (non-fatal on first deploy)
4. Builds and starts Docker containers
5. Waits for `server` and `web` to pass health checks (90s timeout)
6. Runs smoke tests against API `/health` and web frontend

### Configuration

All config lives in `infra/.env.infra` (gitignored, mode 600). Required fields:

| Variable               | Description                          | Validation           |
| ---------------------- | ------------------------------------ | -------------------- |
| `HCLOUD_TOKEN`         | Hetzner Cloud API token              | 64-char alphanumeric |
| `APP_DOMAIN`           | Main app domain (e.g. `example.com`) | Valid domain format  |
| `API_DOMAIN`           | API domain (e.g. `api.example.com`)  | Valid domain format  |
| `TWITCH_CLIENT_ID`     | Twitch app client ID                 | Non-empty            |
| `TWITCH_CLIENT_SECRET` | Twitch app client secret             | Non-empty            |

Secrets (auto-generated, minimum 32 chars): `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `INTERNAL_API_SECRET`.

Optional overrides: `HCLOUD_SERVER_TYPE` (default: cx23), `HCLOUD_LOCATION` (default: nbg1), `SSH_PUBLIC_KEY_PATH`, `DEPLOY_USER` (default: deploy).

Optional services: `SENTRY_DSN`, `PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

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

## Health Monitoring

```bash
# Remote service status (table view)
uv run python run.py health

# Service status
./scripts/deploy.sh status

# Live logs
./scripts/deploy.sh logs

# Single service
./scripts/deploy.sh logs server
```

The `health` command connects via SSH, shows a table of container states and health, and hits the API `/health` endpoint.

---

## Updating

```bash
# Re-deploy (syncs code + rebuilds)
cd infra && uv run python run.py deploy

# Or manually:
git pull
./scripts/deploy.sh restart

# If schema changed:
./scripts/deploy.sh dbsetup
```

---

## Sentry Configuration

Twitch Hub supports Sentry for error tracking and structured logging on both server and web.

| Variable                    | Where     | Description                           |
| --------------------------- | --------- | ------------------------------------- |
| `SENTRY_DSN`                | Server    | Server-side Sentry DSN                |
| `PUBLIC_SENTRY_DSN`         | Web       | Client/server-side Sentry DSN         |
| `PUBLIC_SENTRY_ENVIRONMENT` | Web       | Environment tag (default: production) |
| `SENTRY_AUTH_TOKEN`         | Web build | Auth token for source map upload      |
| `SENTRY_ORG`                | Web build | Sentry organization slug              |
| `SENTRY_PROJECT`            | Web build | Sentry project slug                   |

Both DSNs are optional — Sentry is disabled when the DSN is not set.

To enable source map uploads (recommended for readable stack traces in production), set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in your `.env.production`. These are passed as Docker build args during `docker compose build` so the SvelteKit build plugin can upload source maps.

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

Note: The automated deploy creates a database backup before running `prisma db push`.

### Volumes

Persistent data is stored in Docker volumes: `pgdata`, `redisdata`, `caddy_data`, `caddy_config`.

---

## Troubleshooting

### DNS / TLS Issues

- Caddy needs DNS A records to resolve before it can issue TLS certificates
- The wizard now shows what IP a domain resolves to when it's wrong (not just "not resolving")
- Check DNS propagation: `dig +short your-domain.com`
- View Caddy logs: `./scripts/deploy.sh logs caddy`
- If certificates fail, restart Caddy after DNS propagates: `docker compose -f docker-compose.prod.yml restart caddy`

### Docker Issues

- Check container health: `uv run python run.py health` (or `./scripts/deploy.sh status`)
- View container logs for a specific service: `./scripts/deploy.sh logs <service>`
- Rebuild from scratch: `./scripts/deploy.sh down && ./scripts/deploy.sh deploy`

### Database Issues

- Check postgres health: `./scripts/deploy.sh logs postgres`
- Re-run schema push + seed: `./scripts/deploy.sh dbsetup`
- Run seed independently: `./scripts/deploy.sh seed`

### Wizard Issues

- If the wizard fails mid-run, re-run it — it resumes from the last completed step
- Use `--fresh` to start over: `uv run python run.py wizard --fresh`
- State is stored in `infra/.wizard_state.json` (gitignored)
