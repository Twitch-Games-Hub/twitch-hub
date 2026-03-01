"""pyinfra entrypoint: provision a fresh server (run as root)."""

from config import Config
from tasks.app_clone import ensure_deploy_dir
from tasks.docker import install_docker
from tasks.firewall import configure_firewall
from tasks.swap import configure_swap
from tasks.users import create_deploy_user
from tasks.ssh import harden_ssh

cfg = Config()

# System setup
configure_swap()
configure_firewall()
install_docker()

# User setup (must come before SSH hardening which restricts to deploy user)
create_deploy_user(cfg)
ensure_deploy_dir(cfg)
harden_ssh(cfg)
