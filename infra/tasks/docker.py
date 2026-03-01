"""Install Docker Engine and Compose plugin."""

from __future__ import annotations

from pyinfra.operations import apt, server


def install_docker() -> None:
    # Install prerequisites
    apt.packages(
        name="Install Docker prerequisites",
        packages=[
            "ca-certificates",
            "curl",
            "gnupg",
        ],
        update=True,
    )

    # Add Docker GPG key and repository
    server.shell(
        name="Add Docker GPG key",
        commands=[
            "install -m 0755 -d /etc/apt/keyrings",
            "curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc",
            "chmod a+r /etc/apt/keyrings/docker.asc",
        ],
    )

    server.shell(
        name="Add Docker APT repository",
        commands=[
            'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] '
            'https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" '
            "| tee /etc/apt/sources.list.d/docker.list > /dev/null",
        ],
    )

    # Install Docker
    apt.packages(
        name="Install Docker Engine",
        packages=[
            "docker-ce",
            "docker-ce-cli",
            "containerd.io",
            "docker-buildx-plugin",
            "docker-compose-plugin",
        ],
        update=True,
    )

    server.service(
        name="Enable and start Docker",
        service="docker",
        running=True,
        enabled=True,
    )
