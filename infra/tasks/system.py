"""Update and upgrade system packages."""

from __future__ import annotations

from pyinfra.operations import apt


def update_system_packages() -> None:
    apt.update(
        name="Update apt package lists",
    )

    apt.upgrade(
        name="Upgrade installed packages",
    )
