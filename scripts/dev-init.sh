#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TMUX_SESSION="twitch-hub"
POSTHOG_DIR="$ROOT_DIR/.posthog"

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

COMMAND="${1:-init}"

usage() {
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  init      Full setup and launch tmux dev session (default)"
  echo "  reset     Nuke Docker volumes + node_modules, then full init"
  echo "  restart   Restart Docker containers + tmux dev session (skip install)"
  echo "  stop      Kill tmux session and stop Docker containers"
  echo "  stripe    Start Stripe webhook listener (standalone, no tmux)"
  echo "  posthog   Manage PostHog self-hosted [up|down|nuke] (default: up)"
  exit 0
}

# ── Check prerequisites ──────────────────────────────────────────────

check_prereqs() {
  echo ""
  echo "Checking prerequisites..."

  node_version=$(node -v 2>/dev/null || true)
  if [[ -z "$node_version" ]]; then
    fail "Node.js is not installed"
  fi
  major=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
  if (( major < 22 )); then
    fail "Node.js >= 22 required (found $node_version)"
  fi
  info "Node.js $node_version"

  if ! command -v bun &>/dev/null; then
    fail "bun is not installed (run: curl -fsSL https://bun.sh/install | bash)"
  fi
  info "bun $(bun -v)"

  if ! command -v docker &>/dev/null; then
    fail "Docker is not installed"
  fi
  info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

  if ! command -v tmux &>/dev/null; then
    fail "tmux is not installed (run: sudo apt install tmux)"
  fi
  info "tmux $(tmux -V | awk '{print $2}')"
}

# ── Docker helpers ────────────────────────────────────────────────────

docker_up() {
  echo ""
  echo "Starting PostgreSQL & Redis containers..."
  docker compose -f docker-compose.dev.yml up -d --wait || fail "Docker services failed to start"
  info "PostgreSQL running (localhost:5432)"
  info "Redis running (localhost:6379)"

  # Start PostHog if previously set up
  if [[ -d "$POSTHOG_DIR/posthog" ]]; then
    posthog_up
  fi
}

docker_down() {
  echo ""
  echo "Stopping Docker containers..."
  docker compose -f docker-compose.dev.yml down
  if [[ -d "$POSTHOG_DIR/posthog" ]]; then
    posthog_down
  fi
  info "Containers stopped"
}

docker_nuke() {
  echo ""
  echo "Removing Docker containers and volumes..."
  docker compose -f docker-compose.dev.yml down -v
  if [[ -d "$POSTHOG_DIR/posthog" ]]; then
    posthog_down_volumes
  fi
  info "Containers and volumes removed"
}

# ── PostHog self-hosted helpers ───────────────────────────────────────
# Uses the official PostHog hobby deployment (cloned into .posthog/).
# Docs: https://posthog.com/docs/self-host

posthog_compose() {
  cd "$POSTHOG_DIR"
  docker compose \
    -f posthog/docker-compose.hobby.yml \
    -f docker-compose.local.yml \
    --env-file .env \
    -p posthog "$@"
  cd "$ROOT_DIR"
}

posthog_setup() {
  # Clone PostHog repo (one-time)
  if [[ ! -d "$POSTHOG_DIR/posthog" ]]; then
    echo "Cloning PostHog repository (one-time setup)..."
    mkdir -p "$POSTHOG_DIR"
    git clone --depth 1 https://github.com/PostHog/posthog.git "$POSTHOG_DIR/posthog"
    info "PostHog repo cloned"
  fi

  # Generate secrets
  if [[ ! -f "$POSTHOG_DIR/.env" ]]; then
    echo "Generating PostHog secrets..."
    local secret encryption_salt
    secret=$(head -c 28 /dev/urandom | sha224sum -b | head -c 56)
    encryption_salt=$(openssl rand -hex 16)
    cat > "$POSTHOG_DIR/.env" <<ENVEOF
POSTHOG_SECRET=$secret
ENCRYPTION_SALT_KEYS=$encryption_salt
DOMAIN=localhost
TLS_BLOCK=
REGISTRY_URL=posthog/posthog
CADDY_TLS_BLOCK=
CADDY_HOST=http://:8333
POSTHOG_APP_TAG=latest
ENVEOF
    info "PostHog secrets generated"
  fi

  # Local compose override (port 8333, no TLS)
  cat > "$POSTHOG_DIR/docker-compose.local.yml" <<'LOCALEOF'
services:
  proxy:
    ports: !reset
      - '8333:8333'
    environment:
      CADDY_HOST: 'http://:8333'
      CADDY_TLS_BLOCK: ''
  web:
    environment:
      SITE_URL: http://localhost:8333
      LIVESTREAM_HOST: http://localhost:8333/livestream
      OBJECT_STORAGE_PUBLIC_ENDPOINT: http://localhost:8333
  worker:
    environment:
      SITE_URL: http://localhost:8333
      OBJECT_STORAGE_PUBLIC_ENDPOINT: http://localhost:8333
  plugins:
    environment:
      SITE_URL: http://localhost:8333
      OBJECT_STORAGE_PUBLIC_ENDPOINT: http://localhost:8333
  asyncmigrationscheck:
    environment:
      SITE_URL: http://localhost:8333
  temporal-django-worker:
    environment:
      SITE_URL: http://localhost:8333
LOCALEOF

  # Compose entrypoint scripts (required by hobby deployment)
  mkdir -p "$POSTHOG_DIR/compose"

  cat > "$POSTHOG_DIR/compose/start" <<'STARTEOF'
#!/bin/bash
./compose/wait
./bin/migrate
./bin/docker-server
STARTEOF
  chmod +x "$POSTHOG_DIR/compose/start"

  cat > "$POSTHOG_DIR/compose/temporal-django-worker" <<'TEOF'
#!/bin/bash
./bin/temporal-django-worker
TEOF
  chmod +x "$POSTHOG_DIR/compose/temporal-django-worker"

  cat > "$POSTHOG_DIR/compose/wait" <<'WEOF'
#!/usr/bin/env python3
import socket, time

def loop():
    print("Waiting for ClickHouse and Postgres to be ready")
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect(('clickhouse', 9000))
        print("ClickHouse is ready")
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect(('db', 5432))
        print("Postgres is ready")
    except ConnectionRefusedError:
        time.sleep(5)
        loop()

loop()
WEOF
  chmod +x "$POSTHOG_DIR/compose/wait"

  # GeoIP database (needed for feature-flags and cymbal services)
  mkdir -p "$POSTHOG_DIR/share"
  if [[ ! -f "$POSTHOG_DIR/share/GeoLite2-City.mmdb" ]]; then
    echo "Downloading GeoIP database..."
    if command -v brotli &>/dev/null; then
      curl -fsSL --http1.1 'https://mmdbcdn.posthog.net/' \
        | brotli --decompress > "$POSTHOG_DIR/share/GeoLite2-City.mmdb" 2>/dev/null \
        && info "GeoIP database downloaded" \
        || warn "GeoIP download failed (non-critical)"
    else
      warn "brotli not installed — skipping GeoIP database (sudo apt install brotli)"
    fi
  fi
}

posthog_up() {
  posthog_setup
  echo ""
  echo "Starting PostHog self-hosted (first run pulls ~4GB of images)..."
  posthog_compose up -d || fail "PostHog services failed to start"
  info "PostHog running (http://localhost:8333)"
}

posthog_down() {
  echo ""
  echo "Stopping PostHog containers..."
  posthog_compose down
  info "PostHog stopped"
}

posthog_down_volumes() {
  echo ""
  echo "Removing PostHog containers and volumes..."
  posthog_compose down -v
  info "PostHog volumes removed (repo kept in .posthog/)"
}

posthog_nuke() {
  echo ""
  echo "Removing PostHog completely..."
  if [[ -d "$POSTHOG_DIR" ]]; then
    posthog_compose down -v 2>/dev/null || true
    rm -rf "$POSTHOG_DIR"
  fi
  info "PostHog completely removed"
}

# ── Check .env ───────────────────────────────────────────────────────

check_env() {
  echo ""
  echo "Checking configuration..."
  if [[ ! -f apps/server/.env ]]; then
    fail "apps/server/.env not found — copy from .env.example and fill in values"
  fi
  info "Server .env exists"
}

# ── Install dependencies ─────────────────────────────────────────────

install_deps() {
  echo ""
  echo "Installing dependencies..."
  bun install --frozen-lockfile 2>/dev/null || bun install
  info "Dependencies installed"
}

# ── Database setup ───────────────────────────────────────────────────

setup_db() {
  echo ""
  echo "Setting up database..."
  cd apps/server
  bunx prisma migrate deploy
  info "Migrations applied"
  bunx prisma generate
  info "Prisma client generated"
  cd "$ROOT_DIR"
}

# ── Stripe availability check ────────────────────────────────────────

stripe_available() {
  command -v stripe &>/dev/null || return 1
  [[ -f apps/server/.env ]] || return 1
  local key
  key=$(grep '^STRIPE_SECRET_KEY=' apps/server/.env | cut -d= -f2- || true)
  [[ -n "$key" && "$key" != "sk_test_..." ]] || return 1
  return 0
}

# ── tmux session management ──────────────────────────────────────────

start_tmux_session() {
  echo ""
  echo -e "${GREEN}Launching tmux dev session...${NC}"
  echo "  Web:      http://localhost:5173"
  echo "  Server:   http://localhost:3001"
  if [[ -d "$POSTHOG_DIR/posthog" ]]; then
    echo "  PostHog:  http://localhost:8333"
  fi
  echo ""
  echo "  tmux windows:"
  echo "    0:web     — SvelteKit frontend"
  echo "    1:server  — Express API server"
  echo "    2:docker  — Docker compose logs"
  echo "    3:stripe  — Stripe webhook listener"
  echo ""

  # Kill any existing session
  tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

  # Window 0: web (SvelteKit frontend)
  tmux new-session -d -s "$TMUX_SESSION" -n web -c "$ROOT_DIR" \
    "bun run --filter './apps/web' dev"

  # Window 1: server (Express API)
  tmux new-window -t "$TMUX_SESSION" -n server -c "$ROOT_DIR" \
    "bun run --filter './apps/server' dev"

  # Window 2: docker (compose logs)
  tmux new-window -t "$TMUX_SESSION" -n docker -c "$ROOT_DIR" \
    "docker compose -f docker-compose.dev.yml logs -f"

  # Window 3: stripe (webhook listener or placeholder)
  if stripe_available; then
    local key
    key=$(grep '^STRIPE_SECRET_KEY=' apps/server/.env | cut -d= -f2-)
    tmux new-window -t "$TMUX_SESSION" -n stripe -c "$ROOT_DIR" \
      "stripe listen --forward-to localhost:3001/api/billing/webhook --api-key '$key'"
  else
    tmux new-window -t "$TMUX_SESSION" -n stripe -c "$ROOT_DIR" \
      "echo -e '${YELLOW}Stripe listener not started${NC}'; echo 'Install stripe CLI and set STRIPE_SECRET_KEY in apps/server/.env'; echo ''; echo 'To start manually: ./scripts/dev-init.sh stripe'; echo ''; exec bash"
  fi

  # Focus on web window
  tmux select-window -t "$TMUX_SESSION:0"

  info "tmux session '$TMUX_SESSION' created (4 windows: web, server, docker, stripe)"

  # Attach — handle nested tmux
  if [[ -n "${TMUX:-}" ]]; then
    exec tmux switch-client -t "$TMUX_SESSION"
  else
    exec tmux attach-session -t "$TMUX_SESSION"
  fi
}

kill_tmux_session() {
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    tmux kill-session -t "$TMUX_SESSION"
    info "tmux session '$TMUX_SESSION' killed"
  else
    info "No tmux session '$TMUX_SESSION' running"
  fi
}

# ── Commands ──────────────────────────────────────────────────────────

cmd_init() {
  check_prereqs
  docker_up
  check_env
  install_deps
  setup_db
  start_tmux_session
}

cmd_reset() {
  check_prereqs
  docker_nuke

  echo ""
  echo "Removing node_modules..."
  rm -rf node_modules apps/*/node_modules packages/*/node_modules
  info "node_modules removed"

  docker_up
  check_env
  install_deps
  setup_db
  start_tmux_session
}

cmd_restart() {
  check_prereqs
  docker_up
  check_env
  setup_db
  start_tmux_session
}

cmd_stop() {
  kill_tmux_session
  docker_down
}

cmd_posthog() {
  local subcmd="${2:-up}"
  case "$subcmd" in
    up)   posthog_up   ;;
    down) posthog_down ;;
    nuke) posthog_nuke ;;
    *) fail "Unknown posthog subcommand: $subcmd (use: up, down, nuke)" ;;
  esac
}

cmd_stripe() {
  if ! command -v stripe &>/dev/null; then
    fail "Stripe CLI is not installed — see https://docs.stripe.com/stripe-cli"
  fi
  info "Stripe CLI $(stripe version 2>/dev/null || stripe --version 2>/dev/null)"

  if [[ ! -f apps/server/.env ]]; then
    fail "apps/server/.env not found"
  fi

  # Read existing key from .env
  local key
  key=$(grep '^STRIPE_SECRET_KEY=' apps/server/.env | cut -d= -f2-)
  if [[ -z "$key" || "$key" == "sk_test_..." ]]; then
    fail "Set STRIPE_SECRET_KEY in apps/server/.env first"
  fi

  echo ""
  echo -e "${GREEN}Starting Stripe webhook listener...${NC}"
  echo "  Forwarding to: http://localhost:3001/api/billing/webhook"
  echo ""
  echo -e "${YELLOW}[!]${NC} Copy the whsec_... secret printed below into STRIPE_WEBHOOK_SECRET in apps/server/.env"
  echo ""

  exec stripe listen --forward-to localhost:3001/api/billing/webhook --api-key "$key"
}

# ── Dispatch ──────────────────────────────────────────────────────────

case "$COMMAND" in
  init)    cmd_init    ;;
  reset)   cmd_reset   ;;
  restart) cmd_restart ;;
  stop)    cmd_stop    ;;
  posthog) cmd_posthog "$@" ;;
  stripe)  cmd_stripe  ;;
  -h|--help|help) usage ;;
  *) fail "Unknown command: $COMMAND (run '$0 help' for usage)" ;;
esac
