"""Create deploy user with SSH key access."""

from __future__ import annotations

from pathlib import Path

from pyinfra import host
from pyinfra.operations import files, server

from config import Config


def create_deploy_user(cfg: Config) -> None:
    server.user(
        name=f"Create user '{cfg.deploy_user}'",
        user=cfg.deploy_user,
        shell="/bin/bash",
        groups=["docker"],
        ensure_home=True,
    )

    pub_key_path = Path(cfg.ssh_public_key_path).expanduser()
    pub_key = pub_key_path.read_text().strip()

    ssh_dir = f"/home/{cfg.deploy_user}/.ssh"

    files.directory(
        name=f"Create {ssh_dir}",
        path=ssh_dir,
        user=cfg.deploy_user,
        group=cfg.deploy_user,
        mode="700",
    )

    files.line(
        name="Add SSH public key to authorized_keys",
        path=f"{ssh_dir}/authorized_keys",
        line=pub_key,
    )

    files.file(
        name="Set authorized_keys permissions",
        path=f"{ssh_dir}/authorized_keys",
        user=cfg.deploy_user,
        group=cfg.deploy_user,
        mode="600",
    )
