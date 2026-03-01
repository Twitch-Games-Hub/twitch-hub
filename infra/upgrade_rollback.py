"""pyinfra entrypoint: rollback a failed upgrade (run as deploy user)."""

from config import Config
from tasks.app_upgrade import health_check_upgrade, rollback

cfg = Config()

rollback(cfg)
health_check_upgrade(cfg)
