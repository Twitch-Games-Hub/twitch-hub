"""Ensure the deploy directory exists on the remote server."""

from __future__ import annotations

from pyinfra.operations import files

from config import Config


def ensure_deploy_dir(cfg: Config) -> None:
    files.directory(
        name=f"Ensure deploy directory {cfg.deploy_dir}",
        path=cfg.deploy_dir,
        user=cfg.deploy_user,
        group=cfg.deploy_user,
        mode="755",
    )
