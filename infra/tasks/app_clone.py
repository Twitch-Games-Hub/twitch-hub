"""Clone or update the application repository."""

from __future__ import annotations

from pyinfra.operations import files, git

from config import Config


def clone_repo(cfg: Config) -> None:
    files.directory(
        name=f"Ensure deploy directory {cfg.deploy_dir}",
        path=cfg.deploy_dir,
        user=cfg.deploy_user,
        group=cfg.deploy_user,
        mode="755",
    )

    git.repo(
        name="Clone/update application repo",
        src=cfg.git_repo_url,
        dest=cfg.deploy_dir,
        branch=cfg.git_branch,
        pull=True,
        user=cfg.deploy_user,
    )
