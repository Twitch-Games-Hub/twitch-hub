# Infrastructure

Automated Hetzner VPS deployment for Twitch Hub using [pyinfra](https://pyinfra.com/).

## File Structure

```
infra/
├── config.py          # Central config loaded from .env.infra
├── create_server.py   # Hetzner Cloud VPS creation
├── dns.py             # DNS verification utilities
├── wizard.py          # Interactive first-time setup wizard
├── run.py             # CLI entrypoint (all commands)
├── inventory.py       # pyinfra inventory (server IP)
├── provision.py       # pyinfra: server provisioning (root)
├── deploy.py          # pyinfra: app deployment (deploy user)
├── pyproject.toml     # Python package definition
├── tasks/
│   ├── docker.py      # Docker Engine + Compose installation
│   ├── firewall.py    # UFW firewall rules
│   ├── swap.py        # Swap file creation
│   ├── users.py       # Deploy user + SSH key setup
│   ├── ssh.py         # SSH hardening config
│   ├── app_clone.py   # Git clone / pull
│   ├── app_env.py     # Production .env templating
│   └── app_deploy.py  # Docker Compose build + deploy
└── templates/
    └── .env.production.j2 # Production env file template
```

## Installation

```bash
cd infra
uv sync
```

## Available Commands

```bash
uv run python run.py wizard      # Interactive setup (recommended for first deploy)
uv run python run.py preflight   # Validate prerequisites and config
uv run python run.py secrets     # Generate secrets → .env.infra
uv run python run.py create      # Create Hetzner VPS
uv run python run.py provision   # Provision server (Docker, firewall, SSH)
uv run python run.py deploy      # Deploy application
uv run python run.py full        # create → provision → deploy
```

## First-Time Deployment

The easiest way to deploy for the first time:

```bash
uv run python run.py wizard
```

The wizard walks through every step interactively: prerequisite checks, config collection, secret generation, server creation, DNS setup, and deployment.

## Re-deploying

After code changes, re-deploy with:

```bash
uv run python run.py deploy
```

This is idempotent — it rebuilds Docker images and restarts services. Database schema is pushed and seed data is applied each time (both are idempotent operations).

## Configuration

All configuration is stored in `infra/.env.infra` (gitignored). Use `uv run python run.py secrets` to generate one with placeholder values, or `uv run python run.py wizard` to fill it in interactively.

Run `uv run python run.py preflight` to validate your config before deploying.
