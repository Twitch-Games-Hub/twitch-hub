"""pyinfra entrypoint: upgrade server and web containers (run as deploy user)."""

from config import Config
from tasks.app_upgrade import (
    backup_database_upgrade,
    capture_image_digests,
    cleanup_rollback_file,
    health_check_upgrade,
    login_ghcr,
    pull_new_images,
    recreate_app_containers,
    run_db_migration,
    smoke_test_upgrade,
)

cfg = Config()

capture_image_digests(cfg)
backup_database_upgrade(cfg)
login_ghcr(cfg)
pull_new_images(cfg)
run_db_migration(cfg)
recreate_app_containers(cfg)
health_check_upgrade(cfg)
smoke_test_upgrade(cfg)
cleanup_rollback_file(cfg)
