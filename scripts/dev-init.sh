#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

COMMAND="${1:-init}"

usage() {
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  init      Full setup and start dev server (default)"
  echo "  reset     Nuke Docker volumes + node_modules, then full init"
  echo "  restart   Restart Docker containers + dev server (skip install)"
  echo "  stop      Stop Docker containers"
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

  if ! command -v pnpm &>/dev/null; then
    fail "pnpm is not installed (run: corepack enable && corepack prepare pnpm@latest --activate)"
  fi
  info "pnpm $(pnpm -v)"

  if ! command -v docker &>/dev/null; then
    fail "Docker is not installed"
  fi
  info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
}

# ── Docker helpers ────────────────────────────────────────────────────

docker_up() {
  echo ""
  echo "Starting PostgreSQL & Redis containers..."
  docker compose -f docker-compose.dev.yml up -d --wait || fail "Docker services failed to start"
  info "PostgreSQL running (localhost:5432)"
  info "Redis running (localhost:6379)"
}

docker_down() {
  echo ""
  echo "Stopping Docker containers..."
  docker compose -f docker-compose.dev.yml down
  info "Containers stopped"
}

docker_nuke() {
  echo ""
  echo "Removing Docker containers and volumes..."
  docker compose -f docker-compose.dev.yml down -v
  info "Containers and volumes removed"
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
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  info "Dependencies installed"
}

# ── Database setup ───────────────────────────────────────────────────

setup_db() {
  echo ""
  echo "Setting up database..."
  cd apps/server
  npx prisma migrate deploy
  info "Migrations applied"
  npx prisma generate
  info "Prisma client generated"
  cd "$ROOT_DIR"
}

# ── Start dev server ─────────────────────────────────────────────────

start_dev() {
  echo ""
  echo -e "${GREEN}Starting dev environment...${NC}"
  echo "  Web:    http://localhost:5173"
  echo "  Server: http://localhost:3001"
  echo ""
  exec pnpm dev
}

# ── Commands ──────────────────────────────────────────────────────────

cmd_init() {
  check_prereqs
  docker_up
  check_env
  install_deps
  setup_db
  start_dev
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
  start_dev
}

cmd_restart() {
  check_prereqs
  docker_up
  check_env
  setup_db
  start_dev
}

cmd_stop() {
  docker_down
}

# ── Dispatch ──────────────────────────────────────────────────────────

case "$COMMAND" in
  init)    cmd_init    ;;
  reset)   cmd_reset   ;;
  restart) cmd_restart ;;
  stop)    cmd_stop    ;;
  -h|--help|help) usage ;;
  *) fail "Unknown command: $COMMAND (run '$0 help' for usage)" ;;
esac
