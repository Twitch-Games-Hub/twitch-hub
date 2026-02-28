# Self-Hosting PostHog

PostHog is optional — the app works without it. This guide covers deploying your own PostHog instance and connecting it to Twitch Hub.

## Prerequisites

- A Linux server with at least **4 GB RAM** and **2 CPU cores** (8 GB+ recommended for production)
- Docker and Docker Compose installed
- A domain name (e.g. `posthog.yourdomain.com`) with DNS pointing to the server

## 1. Deploy PostHog

PostHog provides an official one-line installer for self-hosted deployments.

### Quick install

SSH into your server and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/PostHog/posthog/HEAD/bin/deploy-hobby)"
```

This launches an interactive setup that will:

- Clone the PostHog repo into `/opt/posthog`
- Generate a `docker-compose.hobby.yml`
- Start all services (Postgres, Redis, ClickHouse, Kafka, PostHog web, worker, plugins)

### Manual install

If you prefer to control the process:

```bash
git clone https://github.com/PostHog/posthog.git /opt/posthog
cd /opt/posthog

# Copy and edit environment config
cp .env.example .env
```

Edit `/opt/posthog/.env`:

```env
# Required
SECRET_KEY=<generate-a-random-64-char-string>
SITE_URL=https://posthog.yourdomain.com

# Optional: disable signup after creating your admin account
DISABLE_SIGNUP=true
```

Start the stack:

```bash
docker compose -f docker-compose.hobby.yml up -d
```

PostHog will be available at `http://<server-ip>:8000`.

## 2. Set up HTTPS (recommended)

Use a reverse proxy (Caddy, nginx, or Traefik) to terminate TLS in front of PostHog.

### Caddy (simplest)

```bash
sudo apt install caddy
```

`/etc/caddy/Caddyfile`:

```
posthog.yourdomain.com {
    reverse_proxy localhost:8000
}
```

```bash
sudo systemctl restart caddy
```

Caddy handles Let's Encrypt certificates automatically.

### nginx + certbot

```nginx
server {
    server_name posthog.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d posthog.yourdomain.com
```

## 3. Create your PostHog project

1. Open `https://posthog.yourdomain.com` in a browser
2. Create your admin account (first signup)
3. Set `DISABLE_SIGNUP=true` in `/opt/posthog/.env` and restart to prevent public signups
4. Create a new project — PostHog will show you a **Project API Key** (starts with `phc_`)

## 4. Configure Twitch Hub

Add the following to your `.env` file, replacing the host with your self-hosted URL:

```env
# PostHog — self-hosted
POSTHOG_API_KEY=phc_your_project_api_key
POSTHOG_HOST=https://posthog.yourdomain.com
PUBLIC_POSTHOG_KEY=phc_your_project_api_key
PUBLIC_POSTHOG_HOST=https://posthog.yourdomain.com
```

::: info
The backend and frontend use **the same project API key** but via separate env vars. `POSTHOG_API_KEY` is used by the server (Node.js SDK) and `PUBLIC_POSTHOG_KEY` is used by the web app (browser SDK). Both can be the same `phc_...` key from your PostHog project settings.
:::

Restart both the server and web app:

```bash
pnpm dev
# or in production
pnpm build && pnpm start
```

## 5. Verify it works

### Backend

Check the server logs for:

```
PostHog client initialized
```

If the key is missing or empty, you'll see:

```
PostHog API key not configured — analytics disabled
```

### Frontend

Open the browser console and check for network requests to your PostHog host. After logging in, you should see identify and pageview events in your PostHog dashboard under **Activity > Live Events**.

## Maintenance

### Upgrading PostHog

```bash
cd /opt/posthog
git pull
docker compose -f docker-compose.hobby.yml pull
docker compose -f docker-compose.hobby.yml up -d
```

### Backups

PostHog stores data in PostgreSQL and ClickHouse. Back up the Docker volumes:

```bash
# List volumes
docker volume ls | grep posthog

# Back up postgres data
docker run --rm -v posthog_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/posthog-pg-backup.tar.gz -C /data .
```

### Resource usage

The hobby deployment runs ~10 containers. Monitor with:

```bash
docker stats --no-stream | grep posthog
```

If memory is tight, you can reduce ClickHouse memory in the compose file or consider using PostHog Cloud for smaller deployments.

## Troubleshooting

| Problem                | Fix                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Events not appearing   | Check the project API key matches in both PostHog settings and `.env`                 |
| CORS errors in browser | Ensure `SITE_URL` in PostHog `.env` matches your actual domain                        |
| PostHog UI unreachable | Check `docker compose logs web` for errors                                            |
| High memory usage      | ClickHouse is the main consumer — increase server RAM or set memory limits in compose |

## Architecture reference

How PostHog integrates with Twitch Hub:

```
┌─────────────┐    posthog-js     ┌──────────────────┐
│  Web App     │ ───────────────→ │                  │
│  (SvelteKit) │   pageviews,     │  Self-hosted     │
│              │   identify,      │  PostHog         │
│              │   custom events  │                  │
└─────────────┘                   │  posthog.your    │
                                  │  domain.com      │
┌─────────────┐   posthog-node   │                  │
│  Server      │ ───────────────→ │                  │
│  (Express)   │   auth, billing, └──────────────────┘
│              │   game sessions
└─────────────┘
```

### Events tracked

**Server-side** (posthog-node):

- `user_authenticated` — login via Twitch OAuth
- `game_session_created`, `game_started`, `game_ended` — game lifecycle
- `session_budget_exhausted` — rate limiting
- `checkout_initiated`, `credit_pack_purchased`, `subscription_created/updated/cancelled` — Stripe billing

**Client-side** (posthog-js):

- `$pageview` — manual page view tracking
- `upgrade_prompt_shown`, `upgrade_prompt_clicked` — upgrade funnel
- `checkout_success`, `checkout_cancelled`, `checkout_started`, `portal_opened` — billing UI
