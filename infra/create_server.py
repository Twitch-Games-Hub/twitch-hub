"""Create a Hetzner Cloud VPS."""

from __future__ import annotations

import sys
from pathlib import Path

from hcloud import Client, APIException
from hcloud.images import Image
from hcloud.locations import Location
from hcloud.server_types import ServerType

from config import Config


def create_server(cfg: Config) -> str:
    """Create a Hetzner VPS and return its public IP."""
    client = Client(token=cfg.hcloud_token)

    # Validate token with a test API call
    try:
        client.datacenters.get_all()
    except APIException as e:
        print(f"Error: Hetzner API authentication failed: {e}")
        print("Hint: Check that HCLOUD_TOKEN in .env.infra is valid.")
        sys.exit(1)

    # Ensure SSH key is uploaded
    pub_key_path = Path(cfg.ssh_public_key_path).expanduser()
    if not pub_key_path.exists():
        print(f"Error: SSH public key not found at {pub_key_path}")
        print("Hint: Generate one with: ssh-keygen -t ed25519")
        sys.exit(1)

    pub_key_content = pub_key_path.read_text().strip()
    ssh_key_name = f"twitch-hub-{pub_key_path.stem}"

    try:
        ssh_key = client.ssh_keys.get_by_name(ssh_key_name)
        if ssh_key is None:
            print(f"==> Uploading SSH key '{ssh_key_name}'...")
            ssh_key = client.ssh_keys.create(name=ssh_key_name, public_key=pub_key_content)
        else:
            print(f"==> SSH key '{ssh_key_name}' already exists.")
    except APIException as e:
        print(f"Error: Failed to manage SSH key: {e}")
        print("Hint: Check that your SSH public key is valid.")
        sys.exit(1)

    # Check if server already exists
    try:
        existing = client.servers.get_by_name(cfg.server_name)
    except APIException as e:
        print(f"Error: Failed to check existing servers: {e}")
        sys.exit(1)

    if existing is not None:
        ip = existing.public_net.ipv4.ip
        print(f"==> Server '{cfg.server_name}' already exists at {ip}")
        cfg.save_server_ip(ip)
        return ip

    # Create server
    print(f"==> Creating server '{cfg.server_name}' ({cfg.hcloud_server_type} in {cfg.hcloud_location})...")
    try:
        response = client.servers.create(
            name=cfg.server_name,
            server_type=ServerType(name=cfg.hcloud_server_type),
            image=Image(name=cfg.hcloud_image),
            location=Location(name=cfg.hcloud_location),
            ssh_keys=[ssh_key],
        )
    except APIException as e:
        print(f"Error: Failed to create server: {e}")
        print("Hint: Check your Hetzner project limits and that the server type/location are valid.")
        sys.exit(1)

    server = response.server
    ip = server.public_net.ipv4.ip

    print(f"==> Server created! IP: {ip}")
    print("==> Waiting for server to be running...")
    try:
        response.action.wait_until_finished(max_retries=150)  # ~300s timeout
    except APIException as e:
        print(f"Error: Server creation timed out or failed: {e}")
        print(f"Hint: Check the Hetzner console for server '{cfg.server_name}' status.")
        sys.exit(1)
    print("==> Server is ready.")

    cfg.save_server_ip(ip)
    return ip


if __name__ == "__main__":
    cfg = Config()
    create_server(cfg)
