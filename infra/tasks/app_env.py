"""Template .env.production onto the server."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from pyinfra.operations import files

from config import Config

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


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
