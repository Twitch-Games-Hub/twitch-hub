"""Configure swap space for small VPS instances."""

from __future__ import annotations

from pyinfra.operations import files, server


def configure_swap(size_mb: int = 2048) -> None:
    server.shell(
        name=f"Create {size_mb}MB swap file",
        commands=[
            f"if [ ! -f /swapfile ]; then "
            f"fallocate -l {size_mb}M /swapfile && "
            f"chmod 600 /swapfile && "
            f"mkswap /swapfile && "
            f"swapon /swapfile; fi",
        ],
    )

    files.line(
        name="Add swap to fstab",
        path="/etc/fstab",
        line="/swapfile none swap sw 0 0",
    )

    # Tune swappiness for a server workload
    server.sysctl(
        name="Set vm.swappiness to 10",
        key="vm.swappiness",
        value="10",
        persist=True,
    )
