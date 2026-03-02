"""Interactive first-time setup wizard for Twitch Hub production deployment."""

from __future__ import annotations

import os
import secrets
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import ui
from config import ENV_FILE
from state import STEPS, WizardState

INFRA_DIR = Path(__file__).parent
TOTAL_STEPS = len(STEPS)


def _check_command(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def _detect_github_owner() -> str:
    """Infer the GitHub org/user from the git remote URL, or return empty string."""
    import re

    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            cwd=INFRA_DIR.parent,
        )
        url = result.stdout.strip()
        # Matches both HTTPS (https://github.com/ORG/REPO) and SSH (git@github.com:ORG/REPO.git)
        m = re.search(r"github\.com[:/]([^/]+)/", url)
        return m.group(1).lower() if m else ""
    except Exception:
        return ""


def _validate_ghcr_token(token: str) -> tuple[bool, str]:
    """Validate a GHCR PAT via the GitHub API.

    Returns (ok, message). The token owner doesn't have to match the image
    org — a member of an org can pull org-scoped packages with their personal
    PAT. We just verify the token authenticates and has read:packages scope.
    """
    req = urllib.request.Request(
        "https://api.github.com/user",
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "twitch-hub-infra/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            import json

            body = json.loads(resp.read())
            scopes = resp.headers.get("X-OAuth-Scopes", "")
            login = body.get("login", "?")

            # Classic PATs expose scopes; fine-grained PATs don't (skip check)
            if scopes and "read:packages" not in scopes and "write:packages" not in scopes:
                return False, f"Token scopes ({scopes!r}) don't include 'read:packages'"

            return True, f"Token valid (authenticated as: {login})"
    except urllib.error.HTTPError as e:
        return False, f"GitHub API returned HTTP {e.code}"
    except Exception as e:
        return False, f"Could not reach GitHub API: {e}"


def _check_ghcr_images_exist(username: str, token: str) -> tuple[list[str], list[str]]:
    """Return (found, missing) image names by querying the GitHub Packages API."""
    import json

    found: list[str] = []
    missing: list[str] = []

    for image_name in ("twitch-hub-server", "twitch-hub-web"):
        located = False
        # GitHub exposes container packages under /users/ for personal accounts
        # and /orgs/ for organisations — try both.
        for ns in ("users", "orgs"):
            url = (
                f"https://api.github.com/{ns}/{username}"
                f"/packages/container/{image_name}"
            )
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "twitch-hub-infra/1.0",
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        located = True
                        break
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    continue  # try next namespace
                break  # unexpected error — treat as missing
            except Exception:
                break

        (found if located else missing).append(image_name)

    return found, missing


def _find_ssh_key() -> Path:
    ssh_dir = Path.home() / ".ssh"
    for name in ("id_ed25519.pub", "id_rsa.pub", "id_ecdsa.pub"):
        candidate = ssh_dir / name
        if candidate.exists():
            return candidate
    return ssh_dir / "id_ed25519.pub"


def step_prerequisites(state: WizardState) -> Path:
    """Step 1: Check prerequisites."""
    ui.step_header(1, TOTAL_STEPS, "Checking prerequisites")

    if state.is_complete("prerequisites"):
        ssh_key = Path(state.data.get("ssh_key", str(_find_ssh_key())))
        ui.info("Prerequisites already verified (skipping)")
        return ssh_key

    checks = {
        "pyinfra": _check_command("pyinfra"),
        "ssh-keygen": _check_command("ssh-keygen"),
        "rsync": _check_command("rsync"),
    }

    all_ok = True
    for tool, found in checks.items():
        if found:
            ui.success(tool)
        else:
            ui.error(tool, hint=f"Install '{tool}' and re-run the wizard")
            all_ok = False

    default_key = _find_ssh_key()
    ssh_key_input = ui.prompt_input("SSH public key path", default=str(default_key))
    ssh_key = Path(ssh_key_input).expanduser()

    if ssh_key.exists():
        ui.success(f"SSH key ({ssh_key})")
    else:
        ui.error(f"SSH key not found ({ssh_key})", hint="Generate one with: ssh-keygen -t ed25519")
        all_ok = False

    if not all_ok:
        ui.error("Please install missing prerequisites and re-run the wizard.")
        state.mark_failed("prerequisites", "Missing prerequisites")
        sys.exit(1)

    ui.success("All prerequisites satisfied")
    state.data["ssh_key"] = str(ssh_key)
    state.mark_complete("prerequisites")
    return ssh_key


def step_collect_config(state: WizardState, ssh_key: Path) -> dict[str, str]:
    """Step 2: Collect configuration from user."""
    ui.step_header(2, TOTAL_STEPS, "Configuration")

    if state.is_complete("config"):
        ui.info("Configuration already collected (skipping)")
        return {}  # config already in .env.infra

    existing = _read_existing_config()
    if existing:
        ui.info("Loaded existing config from .env.infra — press Enter to keep values")

    config: dict[str, str] = {}
    config["SSH_PUBLIC_KEY_PATH"] = str(ssh_key)
    config["HCLOUD_TOKEN"] = ui.prompt_input(
        "Hetzner Cloud API token",
        default=existing.get("HCLOUD_TOKEN", ""),
        password=True,
    )
    config["APP_DOMAIN"] = ui.prompt_input(
        "App domain (e.g. twitchhub.example.com)",
        default=existing.get("APP_DOMAIN", ""),
    )
    config["API_DOMAIN"] = ui.prompt_input(
        "API domain (e.g. api.twitchhub.example.com)",
        default=existing.get("API_DOMAIN", ""),
    )
    config["TWITCH_CLIENT_ID"] = ui.prompt_input(
        "Twitch Client ID",
        default=existing.get("TWITCH_CLIENT_ID", ""),
    )
    config["TWITCH_CLIENT_SECRET"] = ui.prompt_input(
        "Twitch Client Secret",
        default=existing.get("TWITCH_CLIENT_SECRET", ""),
        password=True,
    )

    # GitHub Container Registry
    ui.console.print("\n  [dim]GitHub Container Registry is used to pull pre-built Docker images.[/dim]")
    ui.console.print("  [dim]Enter the GitHub org or user that owns the repository (image owner).[/dim]")
    ui.console.print("  [dim]The PAT needs the 'read:packages' scope.[/dim]\n")
    detected_owner = _detect_github_owner()
    if detected_owner:
        ui.info(f"Detected GitHub owner from git remote: {detected_owner}")
    github_default = existing.get("GITHUB_USERNAME", detected_owner)
    while True:
        config["GITHUB_USERNAME"] = ui.prompt_input(
            "GitHub org or user (image owner)", default=github_default
        )
        config["GHCR_TOKEN"] = ui.prompt_input(
            "GitHub Personal Access Token (read:packages)",
            default=existing.get("GHCR_TOKEN", ""),
            password=True,
        )
        with ui.create_spinner("Validating GHCR token...") as progress:
            progress.add_task("Checking token with GitHub API...", total=None)
            ok, msg = _validate_ghcr_token(config["GHCR_TOKEN"])
        if ok:
            ui.success(f"GHCR token valid — {msg}")
            break
        ui.error(f"GHCR token check failed: {msg}", hint="Make sure the PAT has the 'read:packages' scope")
        if not ui.confirm("Re-enter GitHub credentials?", default=True):
            ui.warn("Continuing with unvalidated credentials — docker pull may fail at deploy time")
            break

    # Optional
    config["SENTRY_DSN"] = ui.prompt_input(
        "Sentry DSN (server, optional)",
        default=existing.get("SENTRY_DSN", ""),
    )
    config["PUBLIC_SENTRY_DSN"] = ui.prompt_input(
        "Sentry DSN (web, optional)",
        default=existing.get("PUBLIC_SENTRY_DSN", ""),
    )
    config["SENTRY_AUTH_TOKEN"] = ui.prompt_input(
        "Sentry Auth Token (optional)",
        default=existing.get("SENTRY_AUTH_TOKEN", ""),
    )
    config["SENTRY_ORG"] = ui.prompt_input(
        "Sentry Organization slug (optional)",
        default=existing.get("SENTRY_ORG", ""),
    )
    config["SENTRY_PROJECT"] = ui.prompt_input(
        "Sentry Project slug (optional)",
        default=existing.get("SENTRY_PROJECT", ""),
    )
    config["STRIPE_SECRET_KEY"] = ui.prompt_input(
        "Stripe Secret Key (optional)",
        default=existing.get("STRIPE_SECRET_KEY", ""),
    )
    config["STRIPE_WEBHOOK_SECRET"] = ui.prompt_input(
        "Stripe Webhook Secret (optional)",
        default=existing.get("STRIPE_WEBHOOK_SECRET", ""),
    )
    config["STRIPE_MONTHLY_PRICE_ID"] = ui.prompt_input(
        "Stripe Monthly Price ID (optional)",
        default=existing.get("STRIPE_MONTHLY_PRICE_ID", ""),
    )
    config["STRIPE_ANNUAL_PRICE_ID"] = ui.prompt_input(
        "Stripe Annual Price ID (optional)",
        default=existing.get("STRIPE_ANNUAL_PRICE_ID", ""),
    )
    config["STRIPE_CREDIT_PACK_PRICE_ID"] = ui.prompt_input(
        "Stripe Credit Pack Price ID (optional)",
        default=existing.get("STRIPE_CREDIT_PACK_PRICE_ID", ""),
    )

    # Optional DNS automation
    ui.console.print("\n  [dim]Namecheap API credentials enable automatic DNS record creation.[/dim]")
    ui.console.print("  [dim]Leave blank to configure DNS manually later.[/dim]\n")
    config["NAMECHEAP_API_USER"] = ui.prompt_input(
        "Namecheap API username (optional)",
        default=existing.get("NAMECHEAP_API_USER", ""),
    )
    if config["NAMECHEAP_API_USER"]:
        config["NAMECHEAP_API_KEY"] = ui.prompt_input(
            "Namecheap API key",
            default=existing.get("NAMECHEAP_API_KEY", ""),
            password=True,
        )
        config["NAMECHEAP_DOMAIN"] = ui.prompt_input(
            "Namecheap base domain (e.g. terabyte.gg)",
            default=existing.get("NAMECHEAP_DOMAIN", ""),
        )

    state.mark_complete("config")
    return config


def _read_existing_config() -> dict[str, str]:
    """Read all key=value pairs from an existing .env.infra file."""
    found: dict[str, str] = {}
    if not ENV_FILE.exists():
        return found
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if key and value:
            found[key] = value
    return found


def _read_existing_secrets() -> dict[str, str]:
    """Read generated secret values from an existing .env.infra file."""
    secret_keys = {"POSTGRES_PASSWORD", "REDIS_PASSWORD", "JWT_SECRET", "INTERNAL_API_SECRET", "WEBHOOK_SECRET"}
    return {k: v for k, v in _read_existing_config().items() if k in secret_keys}


def step_generate_secrets(state: WizardState, config: dict[str, str]) -> None:
    """Step 3: Generate secrets and write .env.infra."""
    ui.step_header(3, TOTAL_STEPS, "Generating secrets")

    if state.is_complete("secrets"):
        ui.info("Secrets already generated (skipping)")
        return

    existing = _read_existing_secrets()
    if existing:
        ui.warn(f"Existing secrets found in {ENV_FILE}:")
        for key in existing:
            ui.console.print(f"    {key} = [dim]****[/dim]")
        ui.console.print()
        ui.console.print(
            "  [yellow]Regenerating secrets will break any running deployment"
            " that uses the current values.[/yellow]"
        )
        if not ui.confirm("Overwrite existing secrets with new ones?"):
            ui.info("Keeping existing secrets")
            config.update(existing)
        else:
            existing = {}

    for key, nbytes in (
        ("POSTGRES_PASSWORD", 32),
        ("REDIS_PASSWORD", 32),
        ("JWT_SECRET", 48),
        ("INTERNAL_API_SECRET", 48),
        ("WEBHOOK_SECRET", 32),
    ):
        if key not in existing:
            config[key] = secrets.token_urlsafe(nbytes)

    with open(ENV_FILE, "w") as f:
        f.write("# Twitch Hub Infrastructure Config (generated by wizard)\n\n")
        for key, value in config.items():
            if value:
                f.write(f"{key}={value}\n")

    os.chmod(ENV_FILE, 0o600)
    ui.success(f"Wrote config to {ENV_FILE} (mode 600)")
    state.mark_complete("secrets")


def step_create_server(state: WizardState) -> str:
    """Step 4: Create the Hetzner server."""
    ui.step_header(4, TOTAL_STEPS, "Creating Hetzner server")

    if state.is_complete("create_server"):
        from config import Config

        cfg = Config()
        ip = cfg.get_server_ip()
        ui.info(f"Server already created at {ip} (skipping)")
        return ip

    from config import Config
    from create_server import create_server

    cfg = Config()

    ui.summary_table(
        [
            ("Server type", cfg.hcloud_server_type),
            ("Location", cfg.hcloud_location),
            ("Image", cfg.hcloud_image),
            ("Name", cfg.server_name),
        ],
        title="Server Configuration",
    )

    if not ui.confirm("Create this server?"):
        ui.warn("Server creation cancelled")
        sys.exit(0)

    ip = create_server(cfg)

    # Wait for SSH with spinner
    from run import _wait_for_ssh

    with ui.create_spinner("Waiting for SSH...") as progress:
        progress.add_task("Waiting for SSH to become available...", total=None)
        if not _wait_for_ssh(ip):
            state.mark_failed("create_server", "SSH not reachable after 120s")
            ui.error("SSH not reachable after 120s", hint="Check the server in Hetzner console")
            sys.exit(1)

    ui.success(f"Server ready at {ip}")
    state.data["server_ip"] = ip
    state.mark_complete("create_server")
    return ip


def step_dns_wait(state: WizardState, ip: str) -> None:
    """Step 5: DNS configuration — auto via Namecheap or manual fallback."""
    ui.step_header(5, TOTAL_STEPS, "DNS Configuration")

    if state.is_complete("dns"):
        ui.info("DNS already verified (skipping)")
        return

    from config import Config

    cfg = Config()
    domains = [cfg.app_domain, cfg.api_domain]

    if cfg.namecheap_enabled:
        _auto_dns(cfg, domains, ip)
    else:
        _manual_dns_prompt(cfg, ip)

    from dns import wait_for_dns

    ui.info("Checking DNS propagation...")
    if wait_for_dns(domains, ip, timeout=300, interval=10):
        ui.success("DNS records verified")
        state.mark_complete("dns")
    else:
        state.mark_failed("dns", "DNS not propagated within timeout")
        ui.error(
            "DNS not propagated within timeout",
            hint="Fix your DNS records and re-run: python run.py wizard",
        )
        ui.info("The wizard will resume from this step on next run")
        sys.exit(1)


def _auto_dns(cfg, domains: list[str], ip: str) -> None:
    """Attempt automatic DNS configuration via Namecheap API."""
    from namecheap import ensure_a_records, get_public_ip

    try:
        client_ip = get_public_ip()
        ui.info(f"Your public IP: {client_ip}")
        ui.warn(
            "This IP must be whitelisted in Namecheap > Profile > Tools > API Access"
        )
        ui.console.print()

        if not ui.confirm("Configure DNS records automatically via Namecheap?", default=True):
            _manual_dns_prompt(cfg, ip)
            return

        ensure_a_records(
            api_user=cfg.namecheap_api_user,
            api_key=cfg.namecheap_api_key,
            client_ip=client_ip,
            base_domain=cfg.namecheap_domain,
            domains=domains,
            target_ip=ip,
        )
    except Exception as e:
        ui.error(f"Namecheap API failed: {e}")
        ui.info("Falling back to manual DNS configuration")
        _manual_dns_prompt(cfg, ip)


def _manual_dns_prompt(cfg, ip: str) -> None:
    """Show manual DNS instructions and wait for user confirmation."""
    ui.console.print(f"\n  Point your DNS A records to: [bold]{ip}[/bold]")
    ui.console.print(f"    {cfg.app_domain} -> {ip}")
    ui.console.print(f"    {cfg.api_domain} -> {ip}")
    ui.console.print()
    ui.prompt_input("Press Enter when DNS records are configured", default="ok")


def step_provision_and_deploy(state: WizardState) -> None:
    """Step 6: Provision and deploy."""
    ui.step_header(6, TOTAL_STEPS, "Provisioning and deploying")

    if state.is_complete("provision_deploy"):
        ui.info("Already provisioned and deployed (skipping)")
        return

    from config import Config

    cfg = Config()
    ip = cfg.get_server_ip()

    ui.summary_table(
        [
            ("Server IP", ip),
            ("Deploy user", cfg.deploy_user),
            ("Deploy dir", cfg.deploy_dir),
            ("App domain", cfg.app_domain),
            ("API domain", cfg.api_domain),
        ],
        title="Deployment Target",
    )

    if not ui.confirm("Provision and deploy to this server?"):
        ui.warn("Deployment cancelled")
        sys.exit(0)

    # Verify both Docker images have been published to GHCR before we touch the
    # server — avoids a mid-deploy failure that's hard to recover from.
    with ui.create_spinner("Checking GHCR images...") as progress:
        progress.add_task("Querying GitHub Packages API...", total=None)
        _, missing = _check_ghcr_images_exist(cfg.github_username, cfg.ghcr_token)
    if missing:
        ui.error(
            f"Images not yet published to GHCR: {', '.join(missing)}",
            hint=(
                "The CI publish jobs run automatically after tests pass on main. "
                "Wait for the GitHub Actions workflow to complete, then re-run: "
                "python run.py wizard"
            ),
        )
        sys.exit(1)
    ui.success("Both GHCR images found — proceeding with deploy")

    ui.info(f"Provisioning {ip} as root...")
    subprocess.run(
        ["pyinfra", "--user=root", ip, str(INFRA_DIR / "provision.py")],
        check=True,
    )

    from run import _rsync_code

    _rsync_code(cfg)

    ui.info(f"Deploying to {ip} as {cfg.deploy_user}...")
    subprocess.run(
        ["pyinfra", f"--user={cfg.deploy_user}", ip, str(INFRA_DIR / "deploy.py")],
        check=True,
    )

    state.mark_complete("provision_deploy")


def run_wizard(fresh: bool = False) -> None:
    """Run the full interactive setup wizard."""
    state = WizardState.load()

    if fresh:
        state.reset()
        state = WizardState()

    ui.banner("Twitch Hub — Production Setup Wizard")

    # Show resume status if any steps completed
    if state.completed:
        ui.info(f"Resuming wizard — completed steps: {', '.join(state.completed)}")
    if state.failed:
        for step, err in state.failed.items():
            ui.warn(f"Previously failed at '{step}': {err}")
        ui.info("Retrying from failed step...")
        ui.console.print()

    try:
        ssh_key = step_prerequisites(state)
        config = step_collect_config(state, ssh_key)
        step_generate_secrets(state, config)
        ip = step_create_server(state)
        step_dns_wait(state, ip)
        step_provision_and_deploy(state)
    except KeyboardInterrupt:
        state.save()
        ui.console.print()
        ui.warn("Wizard interrupted. Your progress has been saved.")
        ui.info("Re-run [bold]python run.py wizard[/bold] to resume.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        state.mark_failed(
            _current_step(state),
            f"Command failed (exit {e.returncode}): {' '.join(str(a) for a in e.cmd)}",
        )
        ui.error(f"Command failed with exit code {e.returncode}")
        ui.info("Re-run [bold]python run.py wizard[/bold] to resume from this step.")
        sys.exit(1)
    except Exception as e:
        state.mark_failed(_current_step(state), str(e))
        ui.error(str(e), hint="Check your config in .env.infra")
        ui.info("Re-run [bold]python run.py wizard[/bold] to resume.")
        sys.exit(1)

    # Clean up state file on success
    state.delete()

    from config import Config

    cfg = Config()
    ui.console.print()
    ui.banner("Deployment Complete!")
    ui.summary_table(
        [
            ("App", f"https://{cfg.app_domain}"),
            ("API", f"https://{cfg.api_domain}"),
            ("Server IP", ip),
        ],
    )


def _current_step(state: WizardState) -> str:
    """Determine the current (in-progress) step based on what's completed."""
    for step in STEPS:
        if not state.is_complete(step):
            return step
    return STEPS[-1]


if __name__ == "__main__":
    run_wizard()
