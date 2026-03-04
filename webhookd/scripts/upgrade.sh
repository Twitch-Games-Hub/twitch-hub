#!/bin/bash
# Webhook entrypoint — called by webhookd when POST /upgrade is hit.
# Delegates to auto-upgrade.sh with GHCR credentials sourced from .env.production.

set -euo pipefail

# webhookd does not pass container env vars to hook scripts,
# so source credentials from the mounted deploy directory.
set -a
# shellcheck source=/dev/null
source /opt/twitch-hub/.env.production
set +a

exec /opt/twitch-hub/auto-upgrade.sh
