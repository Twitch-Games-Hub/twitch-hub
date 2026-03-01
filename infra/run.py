"""CLI entrypoint for infrastructure operations."""

from __future__ import annotations

import os
import secrets
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

import ui
from config import Config, ENV_FILE

INFRA_DIR = Path(__file__).parent

COMMANDS = {
    "wizard": "Interactive first-time setup (recommended)",
    "preflight": "Validate prerequisites and config",
    "create": "Create Hetzner VPS",
    "dns": "Configure DNS records via Namecheap API",
    "provision": "Provision server (as root)",
    "deploy": "Deploy application (as deploy user)",
    "full": "create -> provision -> deploy",
    "secrets": "Generate secrets and append to .env.infra",
    "health": "Check running service status on the server",
}


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


def _rsync_code(cfg: Config) -> None:
    """Rsync the project to the remote server."""
    ip = cfg.get_server_ip()
    project_root = str(INFRA_DIR.parent) + "/"
    dest = f"{cfg.deploy_user}@{ip}:{cfg.deploy_dir}/"

    ui.info(f"Syncing code to {dest}...")
    with ui.create_spinner("Syncing code...") as progress:
        progress.add_task("Rsyncing project files...", total=None)
        subprocess.run(
            [
                "rsync", "-az", "--delete",
                "--exclude", "node_modules",
                "--exclude", ".git",
                "--exclude", "infra",
                "--exclude", ".env*",
                project_root, dest,
            ],
            check=True,
        )
    ui.success("Code synced")


def cmd_wizard() -> None:
    from wizard import run_wizard

    fresh = "--fresh" in sys.argv
    run_wizard(fresh=fresh)


def cmd_preflight() -> None:
    """Validate prerequisites, config, and SSH key."""
    ui.banner("Preflight Checks")
    errors: list[str] = []

    # Check required tools
    for tool in ("pyinfra", "ssh-keygen", "rsync"):
        if shutil.which(tool):
            ui.success(tool)
        else:
            ui.error(tool, hint=f"Install '{tool}' to continue")
            errors.append(f"'{tool}' not found on PATH")

    # Check SSH key
    if ENV_FILE.exists():
        try:
            ssh_key = Path(Config().ssh_public_key_path).expanduser()
        except RuntimeError:
            ssh_key = Path.home() / ".ssh" / "id_ed25519.pub"
    else:
        ssh_key = Path.home() / ".ssh" / "id_ed25519.pub"

    if ssh_key.exists():
        ui.success(f"SSH key ({ssh_key})")
    else:
        ui.error(f"SSH key not found ({ssh_key})")
        errors.append(f"SSH public key not found at {ssh_key}")

    # Validate config
    if ENV_FILE.exists():
        ui.success(f"Config file ({ENV_FILE})")
        try:
            cfg = Config()
            cfg_errors = cfg.validate()
            if cfg_errors:
                for err in cfg_errors:
                    ui.error(f"Config: {err}")
                    errors.append(err)
            else:
                ui.success("Config values valid")
        except RuntimeError as e:
            ui.error(f"Config: {e}")
            errors.append(str(e))
    else:
        ui.error(f"Config file not found ({ENV_FILE})")
        errors.append(f"Run 'python run.py secrets' to generate {ENV_FILE}")

    ui.console.print()
    if errors:
        ui.error(f"Preflight failed with {len(errors)} error(s)")
        sys.exit(1)
    else:
        ui.success("All preflight checks passed")


def cmd_dns() -> None:
    """Configure DNS records via Namecheap API."""
    cfg = Config()

    if not cfg.namecheap_enabled:
        ui.error(
            "Namecheap DNS not configured",
            hint="Set NAMECHEAP_API_USER, NAMECHEAP_API_KEY, and NAMECHEAP_DOMAIN in .env.infra",
        )
        sys.exit(1)

    ip = cfg.get_server_ip()
    ui.banner(f"DNS Configuration — {cfg.namecheap_domain}")

    from namecheap import ensure_a_records, get_public_ip

    client_ip = get_public_ip()
    ui.info(f"Your public IP: {client_ip}")
    ui.info(f"Server IP: {ip}")
    ui.console.print()

    ensure_a_records(
        api_user=cfg.namecheap_api_user,
        api_key=cfg.namecheap_api_key,
        client_ip=client_ip,
        base_domain=cfg.namecheap_domain,
        domains=[cfg.app_domain, cfg.api_domain],
        target_ip=ip,
    )


def cmd_create() -> None:
    from create_server import create_server

    cfg = Config()
    ip = create_server(cfg)
    ui.success(f"Server IP saved to {cfg.server_ip_file}")
    ui.info(f"Point your DNS records to: {ip}")
    ui.console.print(f"    {cfg.app_domain} -> {ip}")
    ui.console.print(f"    {cfg.api_domain} -> {ip}")


def cmd_provision() -> None:
    dry_run = "--dry-run" in sys.argv
    cfg = Config()
    ip = cfg.get_server_ip()

    if dry_run:
        ui.banner("Provision (dry run)")
        ui.info(f"Would provision {ip} as root")
        ui.info(f"  pyinfra --user=root {ip} {INFRA_DIR / 'provision.py'}")
        return

    ui.info(f"Provisioning {ip} as root...")
    subprocess.run(
        ["pyinfra", "--user=root", ip, str(INFRA_DIR / "provision.py")],
        check=True,
    )


def cmd_deploy() -> None:
    dry_run = "--dry-run" in sys.argv
    cfg = Config()
    ip = cfg.get_server_ip()

    if dry_run:
        ui.banner("Deploy (dry run)")
        ui.info(f"Would sync code to {cfg.deploy_user}@{ip}:{cfg.deploy_dir}/")
        ui.info(f"Would deploy to {ip} as {cfg.deploy_user}")
        ui.info(f"  pyinfra --user={cfg.deploy_user} {ip} {INFRA_DIR / 'deploy.py'}")
        return

    _rsync_code(cfg)
    ui.info(f"Deploying to {ip} as {cfg.deploy_user}...")
    subprocess.run(
        ["pyinfra", f"--user={cfg.deploy_user}", ip, str(INFRA_DIR / "deploy.py")],
        check=True,
    )


def cmd_secrets() -> None:
    generated = {
        "POSTGRES_PASSWORD": secrets.token_urlsafe(32),
        "REDIS_PASSWORD": secrets.token_urlsafe(32),
        "JWT_SECRET": secrets.token_urlsafe(48),
        "INTERNAL_API_SECRET": secrets.token_urlsafe(48),
    }

    ui.banner("Generated Secrets")
    # Mask output — show only last 4 chars
    for key, value in generated.items():
        masked = "*" * (len(value) - 4) + value[-4:]
        ui.info(f"{key}={masked}")

    if ENV_FILE.exists():
        existing = ENV_FILE.read_text()
        to_append = []
        for key, value in generated.items():
            if f"\n{key}=" not in f"\n{existing}" and not existing.startswith(f"{key}="):
                to_append.append(f"{key}={value}")

        if to_append:
            with open(ENV_FILE, "a") as f:
                f.write("\n# Auto-generated secrets\n")
                for line in to_append:
                    f.write(line + "\n")
            os.chmod(ENV_FILE, 0o600)
            ui.success(f"Appended {len(to_append)} new secrets to {ENV_FILE}")
        else:
            ui.info(f"All secret keys already exist in {ENV_FILE} — not overwriting")
    else:
        lines = [f"{k}={v}" for k, v in generated.items()]
        with open(ENV_FILE, "w") as f:
            f.write("# Twitch Hub Infrastructure Config\n")
            f.write("# Fill in the required values, then run: python run.py full\n\n")
            f.write("HCLOUD_TOKEN=\n")
            f.write("APP_DOMAIN=\n")
            f.write("API_DOMAIN=\n")
            f.write("TWITCH_CLIENT_ID=\n")
            f.write("TWITCH_CLIENT_SECRET=\n\n")
            f.write("# Optional: Namecheap DNS API (enables auto-DNS)\n")
            f.write("NAMECHEAP_API_USER=\n")
            f.write("NAMECHEAP_API_KEY=\n")
            f.write("NAMECHEAP_DOMAIN=\n\n")
            f.write("# Auto-generated secrets\n")
            for line in lines:
                f.write(line + "\n")
        os.chmod(ENV_FILE, 0o600)
        ui.success(f"Created {ENV_FILE} with generated secrets (mode 600)")
        ui.info("Fill in the remaining required values before running other commands")


def cmd_full() -> None:
    from create_server import create_server

    cfg = Config()
    ip = create_server(cfg)
    ui.success(f"Server IP: {ip}")
    ui.console.print()

    if cfg.namecheap_enabled:
        from namecheap import ensure_a_records, get_public_ip

        try:
            client_ip = get_public_ip()
            ensure_a_records(
                api_user=cfg.namecheap_api_user,
                api_key=cfg.namecheap_api_key,
                client_ip=client_ip,
                base_domain=cfg.namecheap_domain,
                domains=[cfg.app_domain, cfg.api_domain],
                target_ip=ip,
            )
        except Exception as e:
            ui.error(f"Auto-DNS failed: {e}")
            ui.warn("Configure DNS manually before continuing:")
            ui.console.print(f"    {cfg.app_domain} -> {ip}")
            ui.console.print(f"    {cfg.api_domain} -> {ip}")
    else:
        ui.warn("Configure DNS before continuing:")
        ui.console.print(f"    {cfg.app_domain} -> {ip}")
        ui.console.print(f"    {cfg.api_domain} -> {ip}")
    ui.console.print()

    with ui.create_spinner("Waiting for SSH...") as progress:
        progress.add_task("Waiting for SSH to become available...", total=None)
        if not _wait_for_ssh(ip):
            ui.error("SSH not reachable after 120s", hint="Check the server in Hetzner console")
            sys.exit(1)
    ui.success("SSH is ready")

    ui.console.print()
    cmd_provision()
    ui.console.print()
    cmd_deploy()
    ui.console.print()
    ui.success("Full deployment complete!")


def cmd_health() -> None:
    """Check service status on the remote server."""
    cfg = Config()
    ip = cfg.get_server_ip()
    compose = f"docker compose -f {cfg.deploy_dir}/docker-compose.prod.yml"

    ui.banner(f"Service Health — {ip}")

    # Get container status via SSH
    result = subprocess.run(
        [
            "ssh", "-o", "StrictHostKeyChecking=no",
            f"{cfg.deploy_user}@{ip}",
            f"{compose} ps --format json",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        ui.error("Failed to query containers", hint=result.stderr.strip())
        sys.exit(1)

    import json

    from rich.table import Table

    table = Table(title="Container Status")
    table.add_column("Service", style="bold")
    table.add_column("State")
    table.add_column("Health")
    table.add_column("Ports")

    for line in result.stdout.strip().splitlines():
        try:
            container = json.loads(line)
        except json.JSONDecodeError:
            continue

        name = container.get("Service", container.get("Name", "?"))
        state = container.get("State", "?")
        health = container.get("Health", "")
        ports = container.get("Ports", "")

        state_color = "green" if state == "running" else "red"
        health_color = "green" if health == "healthy" else ("yellow" if health == "starting" else "red")

        table.add_row(
            name,
            f"[{state_color}]{state}[/{state_color}]",
            f"[{health_color}]{health or '-'}[/{health_color}]",
            ports or "-",
        )

    ui.console.print(table)

    # Hit API health endpoint
    ui.console.print()
    api_result = subprocess.run(
        [
            "ssh", "-o", "StrictHostKeyChecking=no",
            f"{cfg.deploy_user}@{ip}",
            "curl -sf http://localhost:3001/health 2>/dev/null || echo 'UNREACHABLE'",
        ],
        capture_output=True,
        text=True,
    )
    api_status = api_result.stdout.strip()
    if api_status and api_status != "UNREACHABLE":
        ui.success(f"API /health: {api_status}")
    else:
        ui.warn("API /health: unreachable")


def _show_help() -> None:
    from rich.table import Table

    ui.banner("Twitch Hub Infrastructure CLI")
    table = Table(show_header=True)
    table.add_column("Command", style="bold cyan")
    table.add_column("Description")
    table.add_column("Flags", style="dim")

    flags: dict[str, str] = {
        "wizard": "--fresh",
        "deploy": "--dry-run",
        "provision": "--dry-run",
    }

    for cmd, desc in COMMANDS.items():
        table.add_row(cmd, desc, flags.get(cmd, ""))

    ui.console.print(table)
    ui.console.print("\n  Usage: [bold]python run.py <command>[/bold]\n")


def main() -> None:
    commands = {
        "wizard": cmd_wizard,
        "preflight": cmd_preflight,
        "create": cmd_create,
        "dns": cmd_dns,
        "provision": cmd_provision,
        "deploy": cmd_deploy,
        "full": cmd_full,
        "secrets": cmd_secrets,
        "health": cmd_health,
    }

    # Extract command (skip flags)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args or args[0] not in commands:
        _show_help()
        sys.exit(1)

    commands[args[0]]()


if __name__ == "__main__":
    main()
