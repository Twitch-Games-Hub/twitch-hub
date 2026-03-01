"""Build and deploy the application with Docker Compose."""

from __future__ import annotations

from pyinfra.operations import server

from config import Config


def deploy_app(cfg: Config) -> None:
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml --env-file {cfg.deploy_dir}/.env.production"

    server.shell(
        name="Build Docker images",
        commands=[f"cd {cfg.deploy_dir} && {compose} build server web"],
    )

    server.shell(
        name="Start core services",
        commands=[f"{compose} up -d postgres redis caddy"],
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
