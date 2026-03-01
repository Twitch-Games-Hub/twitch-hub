#!/bin/bash
# Webhook entrypoint — called by webhookd when POST /upgrade is hit.
# Delegates to auto-upgrade.sh with GHCR credentials from environment.

set -euo pipefail

exec /opt/twitch-hub/auto-upgrade.sh
