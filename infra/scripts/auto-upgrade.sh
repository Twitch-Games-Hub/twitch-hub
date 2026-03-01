#!/usr/bin/env bash
# auto-upgrade.sh — Pull latest images, migrate DB, restart app containers.
# Called by GitHub Actions deploy job or manually on the server.
#
# Required env vars:
#   GHCR_TOKEN       — GitHub token with packages:read scope
#   GITHUB_USERNAME  — GitHub username for GHCR login
#
# Usage:
#   GHCR_TOKEN='...' GITHUB_USERNAME='...' /opt/twitch-hub/auto-upgrade.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEPLOY_DIR="/opt/twitch-hub"
COMPOSE="docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml"
MANIFEST="${DEPLOY_DIR}/.upgrade_rollback"
HEALTH_TIMEOUT=90  # seconds

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[upgrade] $*"; }
die()  { echo "[upgrade] FATAL: $*" >&2; exit 1; }
warn() { echo "[upgrade] WARNING: $*" >&2; }

# ---------------------------------------------------------------------------
# Rollback function — called on failure during steps 5-8
# ---------------------------------------------------------------------------
rollback() {
    warn "Initiating rollback..."

    log "Stopping server and web containers..."
    $COMPOSE stop server web || true

    # Restore database from backup
    if [ -f "$MANIFEST" ]; then
        # shellcheck source=/dev/null
        source "$MANIFEST"
        if [ -n "${BACKUP_FILE:-}" ] && [ -f "${BACKUP_FILE}" ]; then
            log "Restoring database from ${BACKUP_FILE}..."
            $COMPOSE exec -T postgres psql \
                -U "${POSTGRES_USER:-twitch_hub}" \
                "${POSTGRES_DB:-twitch_hub}" < "$BACKUP_FILE" \
                && log "Database restored" \
                || warn "Database restore failed"
        else
            warn "No backup file found — skipping DB restore"
        fi

        # Re-tag old images
        if [ -n "${SERVER_DIGEST:-}" ]; then
            docker tag "$SERVER_DIGEST" "$SERVER_IMAGE" \
                && log "Restored server image: $SERVER_IMAGE" \
                || warn "Failed to re-tag server image"
        fi
        if [ -n "${WEB_DIGEST:-}" ]; then
            docker tag "$WEB_DIGEST" "$WEB_IMAGE" \
                && log "Restored web image: $WEB_IMAGE" \
                || warn "Failed to re-tag web image"
        fi
    else
        warn "No rollback manifest — cannot restore images"
    fi

    log "Restarting server and web with old images..."
    $COMPOSE up -d --force-recreate --no-deps server web || true

    die "Upgrade failed — rolled back to previous version"
}

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
[ -n "${GHCR_TOKEN:-}" ]      || die "GHCR_TOKEN is not set"
[ -n "${GITHUB_USERNAME:-}" ] || die "GITHUB_USERNAME is not set"
[ -f "${DEPLOY_DIR}/docker-compose.prod.yml" ] || die "docker-compose.prod.yml not found in ${DEPLOY_DIR}"

log "Starting upgrade in ${DEPLOY_DIR}"

# ---------------------------------------------------------------------------
# Step 1: Capture current image digests for rollback
# ---------------------------------------------------------------------------
log "Step 1/8: Capturing current image digests..."

SERVER_IMAGE=$($COMPOSE images server --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || echo "")
SERVER_DIGEST=$(docker inspect --format "{{index .RepoDigests 0}}" "$SERVER_IMAGE" 2>/dev/null || echo "")
WEB_IMAGE=$($COMPOSE images web --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || echo "")
WEB_DIGEST=$(docker inspect --format "{{index .RepoDigests 0}}" "$WEB_IMAGE" 2>/dev/null || echo "")

cat > "$MANIFEST" <<EOF
SERVER_IMAGE="${SERVER_IMAGE}"
SERVER_DIGEST="${SERVER_DIGEST}"
WEB_IMAGE="${WEB_IMAGE}"
WEB_DIGEST="${WEB_DIGEST}"
BACKUP_FILE=""
EOF

log "Rollback manifest saved"

# ---------------------------------------------------------------------------
# Step 2: Backup database (fatal on failure)
# ---------------------------------------------------------------------------
log "Step 2/8: Backing up database..."

BACKUP_FILE="${DEPLOY_DIR}/db_upgrade_backup_$(date +%Y%m%d_%H%M%S).sql"

$COMPOSE exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-twitch_hub}" \
    "${POSTGRES_DB:-twitch_hub}" > "$BACKUP_FILE" \
    || die "Database backup failed"

# Update manifest with backup file path
sed -i "s|^BACKUP_FILE=.*|BACKUP_FILE=\"${BACKUP_FILE}\"|" "$MANIFEST"

log "Database backed up to ${BACKUP_FILE}"

# ---------------------------------------------------------------------------
# Step 3: Login to GHCR
# ---------------------------------------------------------------------------
log "Step 3/8: Logging in to GHCR..."

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin \
    || die "GHCR login failed"

# ---------------------------------------------------------------------------
# Step 4: Pull latest images
# ---------------------------------------------------------------------------
log "Step 4/8: Pulling latest images..."

cd "$DEPLOY_DIR"
$COMPOSE pull server web || die "Image pull failed"

# ---------------------------------------------------------------------------
# Step 5: Run DB migration (rollback on failure)
# ---------------------------------------------------------------------------
log "Step 5/8: Running database migration..."

$COMPOSE --profile tools run --rm dbsetup || rollback

# ---------------------------------------------------------------------------
# Step 6: Recreate server + web containers (rollback on failure)
# ---------------------------------------------------------------------------
log "Step 6/8: Recreating server and web containers..."

$COMPOSE up -d --force-recreate --no-deps server web || rollback

# ---------------------------------------------------------------------------
# Step 7: Health check (rollback on timeout)
# ---------------------------------------------------------------------------
log "Step 7/8: Waiting for services to become healthy (${HEALTH_TIMEOUT}s timeout)..."

for service in server web; do
    iterations=$((HEALTH_TIMEOUT / 2))
    healthy=false
    for i in $(seq 1 "$iterations"); do
        status=$($COMPOSE ps "$service" --format "{{.Health}}" 2>/dev/null || echo "")
        if [ "$status" = "healthy" ]; then
            log "${service} is healthy"
            healthy=true
            break
        fi
        sleep 2
    done
    if [ "$healthy" = false ]; then
        warn "${service} did not become healthy within ${HEALTH_TIMEOUT}s"
        rollback
    fi
done

# ---------------------------------------------------------------------------
# Step 8: Smoke tests (rollback on failure)
# ---------------------------------------------------------------------------
log "Step 8/8: Running smoke tests..."

curl -sf http://localhost:3001/health > /dev/null \
    && log "API health: OK" \
    || rollback

curl -sf http://localhost:3000/ > /dev/null \
    && log "Web frontend: OK" \
    || rollback

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
rm -f "$MANIFEST"
log "Rollback manifest cleaned up"

# Clean up old backup files (keep last 5)
# shellcheck disable=SC2012
ls -t "${DEPLOY_DIR}"/db_upgrade_backup_*.sql 2>/dev/null | tail -n +6 | xargs -r rm -f

log "Upgrade complete!"
