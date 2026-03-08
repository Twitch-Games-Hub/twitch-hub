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

# Self-update: fetch the latest auto-upgrade.sh before running it
REPO="${GITHUB_USERNAME}/twitch-hub"
RAW_URL="https://raw.githubusercontent.com/${REPO}/main/infra/scripts/auto-upgrade.sh"
tmp=$(mktemp)
if curl -fsSL -H "Authorization: token ${GHCR_TOKEN}" "$RAW_URL" -o "$tmp" 2>/dev/null; then
    if ! cmp -s "$tmp" /opt/twitch-hub/auto-upgrade.sh 2>/dev/null; then
        cp "$tmp" /opt/twitch-hub/auto-upgrade.sh
        chmod +x /opt/twitch-hub/auto-upgrade.sh
        echo "[upgrade] auto-upgrade.sh updated from repo"
    fi
fi
rm -f "$tmp"

exec /opt/twitch-hub/auto-upgrade.sh
