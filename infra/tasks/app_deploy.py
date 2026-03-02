"""Build and deploy the application with Docker Compose."""

from __future__ import annotations

from pathlib import Path

from pyinfra.operations import files, server

from config import Config

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"


def deploy_app(cfg: Config) -> None:
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"

    files.put(
        name="Deploy auto-upgrade script",
        src=str(SCRIPTS_DIR / "auto-upgrade.sh"),
        dest=f"{cfg.deploy_dir}/auto-upgrade.sh",
        user=cfg.deploy_user,
        group=cfg.deploy_user,
        mode="750",
    )

    server.shell(
        name="Create webhookd directory",
        commands=[f"mkdir -p {cfg.deploy_dir}/webhookd"],
    )

    if cfg.webhook_secret:
        server.shell(
            name="Generate webhookd htpasswd",
            commands=[
                f"docker run --rm httpd:2-alpine htpasswd -nbB deploy '{cfg.webhook_secret}'"
                f" > {cfg.deploy_dir}/webhookd/.htpasswd"
                f" && chmod 600 {cfg.deploy_dir}/webhookd/.htpasswd"
                f' && echo "htpasswd generated"',
            ],
        )

    server.shell(
        name="Symlink .env to .env.production",
        commands=[f"ln -sf {cfg.deploy_dir}/.env.production {cfg.deploy_dir}/.env"],
    )

    # Backup database before schema push (non-fatal on first deploy)
    server.shell(
        name="Backup database before schema push",
        commands=[
            f"if {compose} ps postgres --format '{{{{.Health}}}}' 2>/dev/null | grep -q healthy; then "
            f"{compose} exec -T postgres pg_dump -U ${{POSTGRES_USER:-twitch_hub}} "
            f"${{POSTGRES_DB:-twitch_hub}} > {cfg.deploy_dir}/db_backup_$(date +%Y%m%d_%H%M%S).sql; "
            f"echo 'Database backed up'; "
            f"else echo 'No running postgres — skipping backup (first deploy?)'; fi",
        ],
    )

    server.shell(
        name="Log in to GitHub Container Registry",
        commands=[
            f"echo '{cfg.ghcr_token}' | docker login ghcr.io -u {cfg.github_username} --password-stdin",
        ],
    )

    server.shell(
        name="Pull Docker images",
        commands=[f"cd {cfg.deploy_dir} && {compose} pull server web"],
    )

    server.shell(
        name="Start data stores",
        commands=[f"{compose} up -d postgres redis"],
    )

    server.shell(
        name="Wait for postgres to be healthy",
        commands=[
            f"for i in $(seq 1 30); do "
            f'status=$({compose} ps postgres --format "{{{{.Health}}}}" 2>/dev/null); '
            f'[ "$status" = "healthy" ] && exit 0; '
            f"sleep 2; done; exit 1",
        ],
    )

    server.shell(
        name="Run database setup (push + seed)",
        commands=[f"{compose} --profile tools run --rm dbsetup"],
    )

    server.shell(
        name="Start application services",
        commands=[f"{compose} up -d"],
    )

    # Post-deploy health checks
    for service, port, timeout_sec in [("server", 3001, 90), ("web", 3000, 90)]:
        server.shell(
            name=f"Wait for {service} to be healthy ({timeout_sec}s timeout)",
            commands=[
                f"for i in $(seq 1 {timeout_sec // 2}); do "
                f'status=$({compose} ps {service} --format "{{{{.Health}}}}" 2>/dev/null); '
                f'[ "$status" = "healthy" ] && exit 0; '
                f"sleep 2; done; "
                f'echo "WARNING: {service} did not become healthy within {timeout_sec}s"; exit 0',
            ],
        )

    # Smoke tests (non-fatal warnings)
    server.shell(
        name="Smoke test: API health endpoint",
        commands=[
            "curl -sf http://localhost:3001/healthz > /dev/null "
            '&& echo "API health: OK" '
            '|| echo "WARNING: API health endpoint not responding"',
        ],
    )

    server.shell(
        name="Smoke test: Web frontend",
        commands=[
            "curl -sf http://localhost:3000/ > /dev/null "
            '&& echo "Web frontend: OK" '
            '|| echo "WARNING: Web frontend not responding"',
        ],
    )
