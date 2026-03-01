#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
COMPOSE="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  deploy    Full deployment: build → up → wait for DB → migrate → restart server
  build     Build web and server images
  migrate   Run Prisma migrations
  up        Start all services
  down      Stop all services
  logs      Tail logs (pass service name to filter, e.g. $0 logs server)
  status    Show service status
  restart   Rebuild and restart web + server (keeps data stores running)
  secrets   Generate random secrets and print them
EOF
  exit 1
}

check_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found."
    echo "Copy .env.production.example to $ENV_FILE and fill in your values."
    exit 1
  fi
}

wait_for_healthy() {
  local service="$1"
  local timeout="${2:-60}"
  local elapsed=0

  echo "==> Waiting for $service to be healthy (timeout: ${timeout}s)..."
  while [ $elapsed -lt "$timeout" ]; do
    local status
    status=$($COMPOSE ps "$service" --format '{{.Health}}' 2>/dev/null || echo "unknown")
    if [ "$status" = "healthy" ]; then
      echo "==> $service is healthy."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Error: $service did not become healthy within ${timeout}s."
  echo "Check logs with: $0 logs $service"
  exit 1
}

cmd_build() {
  echo "==> Building images..."
  $COMPOSE build server web
}

cmd_up() {
  echo "==> Starting services..."
  $COMPOSE up -d
}

cmd_down() {
  echo "==> Stopping services..."
  $COMPOSE down
}

cmd_migrate() {
  echo "==> Running database migrations..."
  if ! $COMPOSE run --rm migrate; then
    echo "Error: Database migration failed!"
    echo "Check the migration output above for details."
    exit 1
  fi
  echo "==> Migrations completed successfully."
}

cmd_logs() {
  shift_args="${1:-}"
  if [ -n "$shift_args" ]; then
    $COMPOSE logs -f "$shift_args"
  else
    $COMPOSE logs -f
  fi
}

cmd_status() {
  $COMPOSE ps
}

cmd_restart() {
  echo "==> Rebuilding and restarting web + server..."
  $COMPOSE build server web
  $COMPOSE up -d --no-deps server web
  echo "==> Done. Run '$0 logs' to watch output."
}

cmd_secrets() {
  echo "# Generated secrets — paste these into $ENV_FILE"
  echo ""
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
  echo "REDIS_PASSWORD=$(openssl rand -hex 16)"
  echo "JWT_SECRET=$(openssl rand -hex 24)"
  echo "INTERNAL_API_SECRET=$(openssl rand -hex 24)"
}

cmd_deploy() {
  echo "==> Starting full deployment..."
  cmd_build
  cmd_up
  wait_for_healthy postgres 60
  wait_for_healthy redis 30
  cmd_migrate
  echo "==> Restarting server after migration..."
  $COMPOSE restart server
  echo ""
  echo "==> Deployment complete!"
  cmd_status
}

# ---- Main ----

if [ $# -lt 1 ]; then
  usage
fi

COMMAND="$1"
shift

# secrets doesn't need .env.production to exist
if [ "$COMMAND" != "secrets" ]; then
  check_env
fi

case "$COMMAND" in
  deploy)  cmd_deploy ;;
  build)   cmd_build ;;
  migrate) cmd_migrate ;;
  up)      cmd_up ;;
  down)    cmd_down ;;
  logs)    cmd_logs "${1:-}" ;;
  status)  cmd_status ;;
  restart) cmd_restart ;;
  secrets) cmd_secrets ;;
  *)       usage ;;
esac
