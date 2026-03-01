"""Template .env.production onto the server."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from pyinfra.operations import files, server

from config import Config

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# Keys that must have non-empty values in .env.production
REQUIRED_ENV_KEYS = [
    "APP_DOMAIN",
    "API_DOMAIN",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "REDIS_PASSWORD",
    "JWT_SECRET",
    "INTERNAL_API_SECRET",
    "TWITCH_CLIENT_ID",
    "TWITCH_CLIENT_SECRET",
]


def template_env(cfg: Config) -> None:
    files.template(
        name="Deploy .env.production",
        src=str(TEMPLATES_DIR / "env.production.j2"),
        dest=f"{cfg.deploy_dir}/.env.production",
        user=cfg.deploy_user,
        group=cfg.deploy_user,
        mode="600",
        **asdict(cfg),
    )

    # Validate that all required keys have non-empty values
    checks = " && ".join(
        f'grep -q "^{key}=.\\ +" {cfg.deploy_dir}/.env.production'
        for key in REQUIRED_ENV_KEYS
    )
    server.shell(
        name="Validate .env.production has all required values",
        commands=[
            f"missing=''; "
            + " ".join(
                f'grep -q "^{key}=.\\+" {cfg.deploy_dir}/.env.production || missing="$missing {key}";'
                for key in REQUIRED_ENV_KEYS
            )
            + f' if [ -n "$missing" ]; then echo "FATAL: Missing env vars:$missing"; exit 1; fi; '
            f'echo "All required env vars present"',
        ],
    )
