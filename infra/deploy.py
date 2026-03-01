"""pyinfra entrypoint: deploy the application (run as deploy user)."""

from config import Config
from tasks.app_clone import ensure_deploy_dir
from tasks.app_env import template_env
from tasks.app_deploy import deploy_app

cfg = Config()

ensure_deploy_dir(cfg)
template_env(cfg)
deploy_app(cfg)
