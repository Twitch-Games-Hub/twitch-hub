"""Dynamic pyinfra inventory — reads server IP from .server_ip file."""

from __future__ import annotations

from pathlib import Path

server_ip_file = Path(__file__).parent / ".server_ip"

if server_ip_file.exists():
    ip = server_ip_file.read_text().strip()
    hosts = [ip]
else:
    hosts = []
