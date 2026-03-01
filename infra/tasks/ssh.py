"""Harden SSH configuration."""

from __future__ import annotations

from pathlib import Path

from pyinfra.operations import files, server

from config import Config

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def harden_ssh(cfg: Config) -> None:
    files.template(
        name="Deploy hardened sshd_config",
        src=str(TEMPLATES_DIR / "sshd_config.j2"),
        dest="/etc/ssh/sshd_config",
        deploy_user=cfg.deploy_user,
        mode="644",
        user="root",
        group="root",
    )

    server.shell(
        name="Validate sshd config before restart",
        commands=["sshd -t"],
    )

    server.service(
        name="Restart sshd",
        service="ssh",
        restarted=True,
    )
