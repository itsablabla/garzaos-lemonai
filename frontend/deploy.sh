#!/usr/bin/env bash
set -euo pipefail

: "${LEMON_FRONTEND_DEPLOY_HOST:?Set LEMON_FRONTEND_DEPLOY_HOST, for example user@example.com}"
: "${LEMON_FRONTEND_DEPLOY_PATH:?Set LEMON_FRONTEND_DEPLOY_PATH, for example /var/www/lemon/dist}"

pnpm build

scp -r dist/* "${LEMON_FRONTEND_DEPLOY_HOST}:${LEMON_FRONTEND_DEPLOY_PATH}"
