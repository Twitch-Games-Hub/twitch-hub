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

# ── Check prerequisites ──────────────────────────────────────────────

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

# ── Start Docker services ────────────────────────────────────────────

echo ""
echo "Starting PostgreSQL & Redis containers..."

docker compose -f docker-compose.dev.yml up -d --wait || fail "Docker services failed to start"

info "PostgreSQL running (localhost:5432)"
info "Redis running (localhost:6379)"

# ── Check .env ───────────────────────────────────────────────────────

echo ""
echo "Checking configuration..."

if [[ ! -f apps/server/.env ]]; then
  fail "apps/server/.env not found — copy from .env.example and fill in values"
fi
info "Server .env exists"

# ── Install dependencies ─────────────────────────────────────────────

echo ""
echo "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
info "Dependencies installed"

# ── Database setup ───────────────────────────────────────────────────

echo ""
echo "Setting up database..."

cd apps/server

npx prisma migrate deploy
info "Migrations applied"

npx prisma generate
info "Prisma client generated"

cd "$ROOT_DIR"

# ── Start dev server ─────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Starting dev environment...${NC}"
echo "  Web:    http://localhost:5173"
echo "  Server: http://localhost:3001"
echo ""

exec pnpm dev
