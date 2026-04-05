#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Байдабаза — Database initialization helper
# Applies schema migrations and seeds default settings.
# Note: install.sh already runs this automatically on first install.
# Use this script only for manual re-initialization.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }

if [ -f ".env" ]; then
  set -a && source .env && set +a
fi

[ -z "${DATABASE_URL:-}" ] && error "DATABASE_URL is not set. Check your .env file."

info "Running database migrations (drizzle push)..."
pnpm --filter @workspace/db run push
success "Migrations applied"

info "Seeding default settings..."
API_ENDPOINT="${API_URL:-http://localhost:8080}/api"
ADMIN_LOGIN="${BOOTSTRAP_SUPERADMIN_EMAIL:-${ADMIN_EMAIL:-}}"
ADMIN_PASS="${BOOTSTRAP_SUPERADMIN_PASSWORD:-${ADMIN_PASSWORD:-}}"

if [ -z "$ADMIN_LOGIN" ] || [ -z "$ADMIN_PASS" ]; then
  warn "BOOTSTRAP_SUPERADMIN_EMAIL / PASSWORD not set — skipping settings seed"
  exit 0
fi

TOKEN=$(curl -sf -X POST "${API_ENDPOINT}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_LOGIN}\",\"password\":\"${ADMIN_PASS}\"}" \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)

if [ -n "$TOKEN" ]; then
  curl -sf -X POST "${API_ENDPOINT}/settings/init" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" > /dev/null
  success "Settings seeded"
else
  warn "Could not obtain auth token. Start the API first, then run this script."
fi

echo ""
success "Database initialization complete."
