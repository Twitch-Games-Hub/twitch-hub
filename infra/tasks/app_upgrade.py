"""Upgrade application containers with automatic rollback on failure."""

from __future__ import annotations

from pyinfra.operations import server

from config import Config


def capture_image_digests(cfg: Config) -> None:
    """Capture current image digests for rollback."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"
    manifest = f"{cfg.deploy_dir}/.upgrade_rollback"

    server.shell(
        name="Capture current image digests for rollback",
        commands=[
            f'SERVER_IMAGE=$({compose} images server --format "{{{{.Repository}}}}:{{{{.Tag}}}}")'
            f' && SERVER_DIGEST=$(docker inspect --format "{{{{index .RepoDigests 0}}}}" "$SERVER_IMAGE" 2>/dev/null || echo "")'
            f' && WEB_IMAGE=$({compose} images web --format "{{{{.Repository}}}}:{{{{.Tag}}}}")'
            f' && WEB_DIGEST=$(docker inspect --format "{{{{index .RepoDigests 0}}}}" "$WEB_IMAGE" 2>/dev/null || echo "")'
            f' && cat > {manifest} <<ROLLBACK_EOF\n'
            f'SERVER_IMAGE="$SERVER_IMAGE"\n'
            f'SERVER_DIGEST="$SERVER_DIGEST"\n'
            f'WEB_IMAGE="$WEB_IMAGE"\n'
            f'WEB_DIGEST="$WEB_DIGEST"\n'
            f'BACKUP_FILE=""\n'
            f'ROLLBACK_EOF\n'
            f'echo "Rollback manifest saved to {manifest}"',
        ],
    )


def backup_database_upgrade(cfg: Config) -> None:
    """Backup database before upgrade (fatal on failure)."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"
    backup_file = f"{cfg.deploy_dir}/db_upgrade_backup_$(date +%Y%m%d_%H%M%S).sql"
    manifest = f"{cfg.deploy_dir}/.upgrade_rollback"

    server.shell(
        name="Backup database (fatal on failure)",
        commands=[
            f'BACKUP_FILE="{backup_file}"'
            f" && {compose} exec -T postgres pg_dump -U ${{POSTGRES_USER:-twitch_hub}}"
            f" ${{POSTGRES_DB:-twitch_hub}} > $BACKUP_FILE"
            f' && sed -i "s|^BACKUP_FILE=.*|BACKUP_FILE=\\"$BACKUP_FILE\\"|" {manifest}'
            f' && echo "Database backed up to $BACKUP_FILE"'
            f" || {{ echo 'FATAL: Database backup failed'; exit 1; }}",
        ],
    )


def login_ghcr(cfg: Config) -> None:
    """Log in to GitHub Container Registry."""
    server.shell(
        name="Log in to GitHub Container Registry",
        commands=[
            f"echo '{cfg.ghcr_token}' | docker login ghcr.io -u {cfg.github_username} --password-stdin",
        ],
    )


def pull_new_images(cfg: Config) -> None:
    """Pull latest server and web images."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"

    server.shell(
        name="Pull latest server and web images",
        commands=[f"cd {cfg.deploy_dir} && {compose} pull server web"],
    )


def run_db_migration(cfg: Config) -> None:
    """Run database migration (prisma db push + seed)."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"

    server.shell(
        name="Run database migration (push + seed)",
        commands=[f"{compose} --profile tools run --rm dbsetup"],
    )


def recreate_app_containers(cfg: Config) -> None:
    """Recreate only server and web containers (no-deps to leave infra alone)."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"

    server.shell(
        name="Recreate server and web containers",
        commands=[f"{compose} up -d --force-recreate --no-deps server web"],
    )


def health_check_upgrade(cfg: Config) -> None:
    """Wait for server and web to become healthy (fatal on timeout)."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"

    for service, timeout_sec in [("server", 90), ("web", 90)]:
        server.shell(
            name=f"Health check: {service} ({timeout_sec}s timeout, fatal)",
            commands=[
                f"for i in $(seq 1 {timeout_sec // 2}); do "
                f'status=$({compose} ps {service} --format "{{{{.Health}}}}" 2>/dev/null); '
                f'[ "$status" = "healthy" ] && echo "{service} is healthy" && exit 0; '
                f"sleep 2; done; "
                f'echo "FATAL: {service} did not become healthy within {timeout_sec}s"; exit 1',
            ],
        )


def smoke_test_upgrade(cfg: Config) -> None:
    """Curl health endpoints (fatal on failure)."""
    server.shell(
        name="Smoke test: API health endpoint",
        commands=[
            "curl -sf http://localhost:3001/healthz > /dev/null"
            ' && echo "API health: OK"'
            ' || { echo "FATAL: API health endpoint not responding"; exit 1; }',
        ],
    )

    server.shell(
        name="Smoke test: Web frontend",
        commands=[
            "curl -sf http://localhost:3000/ > /dev/null"
            ' && echo "Web frontend: OK"'
            ' || { echo "FATAL: Web frontend not responding"; exit 1; }',
        ],
    )


def rollback(cfg: Config) -> None:
    """Roll back to previous images and restore database."""
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"
    manifest = f"{cfg.deploy_dir}/.upgrade_rollback"

    server.shell(
        name="Stop server and web containers",
        commands=[f"{compose} stop server web"],
    )

    server.shell(
        name="Restore database from backup",
        commands=[
            f'source {manifest}'
            f' && if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then'
            f" {compose} exec -T postgres psql -U ${{POSTGRES_USER:-twitch_hub}}"
            f" ${{POSTGRES_DB:-twitch_hub}} < $BACKUP_FILE"
            f' && echo "Database restored from $BACKUP_FILE";'
            f' else echo "WARNING: No backup file found — skipping DB restore"; fi',
        ],
    )

    server.shell(
        name="Restore old image tags",
        commands=[
            f'source {manifest}'
            f' && if [ -n "$SERVER_DIGEST" ]; then'
            f' docker tag "$SERVER_DIGEST" "$SERVER_IMAGE"'
            f' && echo "Restored server image: $SERVER_IMAGE";'
            f' else echo "WARNING: No server digest — skipping re-tag"; fi'
            f' && if [ -n "$WEB_DIGEST" ]; then'
            f' docker tag "$WEB_DIGEST" "$WEB_IMAGE"'
            f' && echo "Restored web image: $WEB_IMAGE";'
            f' else echo "WARNING: No web digest — skipping re-tag"; fi',
        ],
    )

    server.shell(
        name="Restart server and web with old images",
        commands=[f"{compose} up -d --force-recreate --no-deps server web"],
    )


def cleanup_rollback_file(cfg: Config) -> None:
    """Remove the rollback manifest after successful upgrade."""
    manifest = f"{cfg.deploy_dir}/.upgrade_rollback"

    server.shell(
        name="Cleanup rollback manifest",
        commands=[f"rm -f {manifest} && echo 'Rollback manifest cleaned up'"],
    )
