"""Configure UFW firewall rules."""

from __future__ import annotations

from pyinfra.operations import apt, server


def configure_firewall() -> None:
    apt.packages(
        name="Install UFW",
        packages=["ufw"],
    )

    for port, desc in [("22", "SSH"), ("80", "HTTP"), ("443", "HTTPS")]:
        server.shell(
            name=f"Allow {desc} (port {port})",
            commands=[f"ufw allow {port}/tcp"],
        )

    server.shell(
        name="Set UFW default deny incoming",
        commands=["ufw default deny incoming"],
    )

    server.shell(
        name="Set UFW default allow outgoing",
        commands=["ufw default allow outgoing"],
    )

    server.shell(
        name="Enable UFW",
        commands=["echo 'y' | ufw enable"],
    )
