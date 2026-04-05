#!/usr/bin/env bash
# =============================================================================
# Байдабаза — Update Script
# Usage: bash deploy/update.sh
# Rebuilds and restarts all services, applies migrations, keeps data intact.
# =============================================================================
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }

if [ -f ".env" ]; then
  set -a && source .env && set +a
fi

echo -e "${CYAN}╔══════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║    Байдабаза — Update               ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Backup database before update ─────────────────────────────────────────
info "Creating pre-update database backup..."
bash deploy/backup-db.sh "pre_update_$(date +%Y%m%d_%H%M%S).sql" || warn "Backup skipped (non-fatal)"

# ── 2. Rebuild images ─────────────────────────────────────────────────────────
info "Rebuilding Docker images..."
docker compose build --parallel --no-cache
success "Images rebuilt"

# ── 3. Apply migrations (before restarting services) ─────────────────────────
info "Applying database migrations..."
docker compose run --rm --no-deps api \
  bash -c "cd /app && pnpm --filter @workspace/db run push" \
  || error "Migrations failed. Update aborted."
success "Migrations applied"

# ── 4. Restart services with zero downtime strategy ──────────────────────────
info "Restarting API..."
docker compose up -d --no-deps api
sleep 5

info "Restarting web and admin..."
docker compose up -d --no-deps web admin

info "Reloading nginx..."
docker compose exec nginx nginx -s reload 2>/dev/null || docker compose up -d --no-deps nginx

# ── 5. Health check ──────────────────────────────────────────────────────────
info "Checking services..."
sleep 5
docker compose ps

# ── 6. Check VAPID keys still configured ─────────────────────────────────────
if [ -z "${VAPID_PUBLIC_KEY:-}" ] || [ -z "${VAPID_PRIVATE_KEY:-}" ]; then
  warn "VAPID keys not set — Web Push notifications disabled"
  warn "Add VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to .env to enable"
else
  success "VAPID keys present — Push notifications active"
fi

echo ""
success "Update complete!"
echo ""
echo -e "  ${CYAN}Logs:${RESET}        docker compose logs -f api"
echo -e "  ${CYAN}PWA проверка:${RESET} Chrome → DevTools → Application → Manifest"
echo -e "  ${CYAN}SW обновление:${RESET} Клиенты получат новый SW автоматически (skipWaiting)"
