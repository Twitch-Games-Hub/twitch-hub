"""CLI entrypoint for infrastructure operations.

Usage:
    python run.py wizard      Interactive first-time setup (recommended)
    python run.py preflight   Validate prerequisites and config
    python run.py create      Create Hetzner VPS
    python run.py provision   Provision server (as root)
    python run.py deploy      Deploy application (as deploy user)
    python run.py full        create → provision → deploy
    python run.py secrets     Generate secrets and append to .env.infra
"""

from __future__ import annotations

import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

from config import Config, ENV_FILE

INFRA_DIR = Path(__file__).parent


def _wait_for_ssh(ip: str, timeout: int = 120) -> bool:
    """Wait until SSH is reachable on the given IP."""
    elapsed = 0
    while elapsed < timeout:
        try:
            sock = socket.create_connection((ip, 22), timeout=5)
            sock.close()
            return True
        except (ConnectionRefusedError, TimeoutError, OSError):
            time.sleep(5)
            elapsed += 5
    return False


def cmd_wizard() -> None:
    from wizard import run_wizard

    run_wizard()


def cmd_preflight() -> None:
    """Validate prerequisites, config, and SSH key."""
    import shutil

    print("==> Preflight checks\n")
    errors: list[str] = []

    # Check required tools
    for tool in ("pyinfra", "ssh-keygen"):
        if shutil.which(tool):
            print(f"  {tool}: OK")
        else:
            print(f"  {tool}: MISSING")
            errors.append(f"'{tool}' not found on PATH")

    # Check SSH key (use config path if .env.infra exists, otherwise default)
    if ENV_FILE.exists():
        try:
            ssh_key = Path(Config().ssh_public_key_path).expanduser()
        except RuntimeError:
            ssh_key = Path.home() / ".ssh" / "id_ed25519.pub"
    else:
        ssh_key = Path.home() / ".ssh" / "id_ed25519.pub"
    if ssh_key.exists():
        print(f"  SSH key: OK ({ssh_key})")
    else:
        print(f"  SSH key: MISSING ({ssh_key})")
        errors.append(f"SSH public key not found at {ssh_key}")

    # Validate config
    if ENV_FILE.exists():
        print(f"  Config file: OK ({ENV_FILE})")
        try:
            cfg = Config()
            cfg_errors = cfg.validate()
            if cfg_errors:
                for err in cfg_errors:
                    print(f"  Config: {err}")
                    errors.append(err)
            else:
                print("  Config values: OK")
        except RuntimeError as e:
            print(f"  Config: {e}")
            errors.append(str(e))
    else:
        print(f"  Config file: MISSING ({ENV_FILE})")
        errors.append(f"Run 'python run.py secrets' to generate {ENV_FILE}")

    if errors:
        print(f"\nPreflight failed with {len(errors)} error(s).")
        sys.exit(1)
    else:
        print("\nAll preflight checks passed.")


def cmd_create() -> None:
    from create_server import create_server

    cfg = Config()
    ip = create_server(cfg)
    print(f"\nServer IP saved to {cfg.server_ip_file}")
    print(f"Point your DNS records to: {ip}")
    print(f"  {cfg.app_domain} → {ip}")
    print(f"  {cfg.api_domain} → {ip}")


def cmd_provision() -> None:
    cfg = Config()
    ip = cfg.get_server_ip()
    print(f"==> Provisioning {ip} as root...")
    subprocess.run(
        ["pyinfra", "--user=root", ip, str(INFRA_DIR / "provision.py")],
        check=True,
    )


def cmd_deploy() -> None:
    cfg = Config()
    ip = cfg.get_server_ip()
    print(f"==> Deploying to {ip} as {cfg.deploy_user}...")
    subprocess.run(
        ["pyinfra", f"--user={cfg.deploy_user}", ip, str(INFRA_DIR / "deploy.py")],
        check=True,
    )


def cmd_secrets() -> None:
    generated = {
        "POSTGRES_PASSWORD": secrets.token_urlsafe(24),
        "REDIS_PASSWORD": secrets.token_urlsafe(24),
        "JWT_SECRET": secrets.token_urlsafe(32),
        "INTERNAL_API_SECRET": secrets.token_urlsafe(32),
    }

    print("Generated secrets:\n")
    lines = []
    for key, value in generated.items():
        line = f"{key}={value}"
        print(f"  {line}")
        lines.append(line)

    if ENV_FILE.exists():
        existing = ENV_FILE.read_text()
        # Only append keys that aren't already set
        to_append = []
        for key, value in generated.items():
            if f"\n{key}=" not in f"\n{existing}" and not existing.startswith(f"{key}="):
                to_append.append(f"{key}={value}")

        if to_append:
            with open(ENV_FILE, "a") as f:
                f.write("\n# Auto-generated secrets\n")
                for line in to_append:
                    f.write(line + "\n")
            print(f"\nAppended {len(to_append)} new secrets to {ENV_FILE}")
        else:
            print(f"\nAll secret keys already exist in {ENV_FILE} — not overwriting.")
    else:
        with open(ENV_FILE, "w") as f:
            f.write("# Twitch Hub Infrastructure Config\n")
            f.write("# Fill in the required values, then run: python run.py full\n\n")
            f.write("HCLOUD_TOKEN=\n")
            f.write("APP_DOMAIN=\n")
            f.write("API_DOMAIN=\n")
            f.write("GIT_REPO_URL=\n")
            f.write("TWITCH_CLIENT_ID=\n")
            f.write("TWITCH_CLIENT_SECRET=\n\n")
            f.write("# Auto-generated secrets\n")
            for line in lines:
                f.write(line + "\n")
        print(f"\nCreated {ENV_FILE} with generated secrets.")
        print("Fill in the remaining required values before running other commands.")


def cmd_full() -> None:
    from create_server import create_server

    cfg = Config()
    ip = create_server(cfg)

    print(f"\nServer IP: {ip}")
    print(f"\nIMPORTANT: Configure DNS before continuing:")
    print(f"  {cfg.app_domain} → {ip}")
    print(f"  {cfg.api_domain} → {ip}")
    print()

    print("==> Waiting for SSH to become available...")
    if not _wait_for_ssh(ip):
        print("Error: SSH not reachable after 120s. Check the server in Hetzner console.")
        sys.exit(1)
    print("==> SSH is ready.")

    print()
    cmd_provision()
    print()
    cmd_deploy()
    print("\n==> Full deployment complete!")


def main() -> None:
    commands = {
        "wizard": cmd_wizard,
        "preflight": cmd_preflight,
        "create": cmd_create,
        "provision": cmd_provision,
        "deploy": cmd_deploy,
        "full": cmd_full,
        "secrets": cmd_secrets,
    }

    if len(sys.argv) < 2 or sys.argv[1] not in commands:
        print(__doc__)
        sys.exit(1)

    commands[sys.argv[1]]()


if __name__ == "__main__":
    main()
