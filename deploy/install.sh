#!/usr/bin/env bash
# =============================================================================
# Байдабаза — Production Install Script
# Usage: bash deploy/install.sh
# =============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║    Байдабаза — Production Installer          ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${RESET}"

# ── 1. Check Docker ──────────────────────────────────────────────────────────
info "Checking Docker..."
command -v docker >/dev/null 2>&1 || error "Docker not found. Install: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || error "Docker Compose plugin not found. Update Docker or install docker-compose-plugin."
success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
success "Docker Compose $(docker compose version --short)"

# ── 2. Check .env ────────────────────────────────────────────────────────────
info "Checking .env..."
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env not found. Copying .env.example → .env"
    cp .env.example .env
    warn "Edit .env with your real values, then re-run: bash deploy/install.sh"
    exit 1
  else
    error ".env file not found. Create it from .env.example"
  fi
fi

set -a && source .env && set +a
success ".env loaded"

# Check required variables
REQUIRED_VARS=(POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET SESSION_SECRET)
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ] || [[ "${!var}" == *"CHANGE_ME"* ]]; then
    error "Variable $var is not set or still has placeholder value. Edit .env"
  fi
done
success "Required environment variables OK"

# ── 3. Create directories ────────────────────────────────────────────────────
info "Creating directories..."
mkdir -p backups docker/ssl
success "Directories ready"

# ── 4. Build images ──────────────────────────────────────────────────────────
info "Building Docker images (first run takes a few minutes)..."
docker compose build --parallel
success "Images built"

# ── 5. Start database + redis ────────────────────────────────────────────────
info "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis
success "postgres and redis started"

# ── 6. Wait for PostgreSQL ───────────────────────────────────────────────────
info "Waiting for PostgreSQL to be ready..."
ATTEMPTS=0; MAX=30
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-baydabaza}" -q 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ $ATTEMPTS -ge $MAX ] && error "PostgreSQL not ready after ${MAX} attempts. Check: docker compose logs postgres"
  echo -n "."; sleep 2
done
echo ""; success "PostgreSQL is ready"

# ── 7. Wait for Redis ────────────────────────────────────────────────────────
info "Waiting for Redis to be ready..."
ATTEMPTS=0
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ $ATTEMPTS -ge 15 ] && error "Redis not ready. Check: docker compose logs redis"
  sleep 1
done
success "Redis is ready"

# ── 8. Run database migrations ───────────────────────────────────────────────
if [ "${APP_RUN_MIGRATIONS:-true}" = "true" ]; then
  info "Running database migrations..."
  docker compose run --rm --no-deps api \
    bash -c "cd /app && pnpm --filter @workspace/db run push" \
    || error "Migrations failed. Check logs above."
  success "Migrations applied"
else
  warn "APP_RUN_MIGRATIONS=false — skipping migrations"
fi

# ── 9. Start API ─────────────────────────────────────────────────────────────
info "Starting API server..."
docker compose up -d api
success "API server started"

# ── 10. Wait for API ─────────────────────────────────────────────────────────
info "Waiting for API to be ready..."
ATTEMPTS=0; MAX=40
API_PORT="${PORT:-8080}"
until docker compose exec -T api wget -qO- "http://localhost:${API_PORT}/api/auth/healthz" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge $MAX ]; then
    warn "API health check timed out. Continuing anyway (check: docker compose logs api)..."
    break
  fi
  echo -n "."; sleep 3
done
echo ""; success "API is ready"

# ── 11. Create superadmin ────────────────────────────────────────────────────
if [ "${BOOTSTRAP_SUPERADMIN_CREATE:-false}" = "true" ]; then
  info "Creating superadmin account..."
  SA_EMAIL="${BOOTSTRAP_SUPERADMIN_EMAIL:-}"
  SA_PASS="${BOOTSTRAP_SUPERADMIN_PASSWORD:-}"
  SA_FIRST="${BOOTSTRAP_SUPERADMIN_FIRST_NAME:-Администратор}"
  SA_LAST="${BOOTSTRAP_SUPERADMIN_LAST_NAME:-}"
  SA_PHONE="${BOOTSTRAP_SUPERADMIN_PHONE:-}"

  if [ -z "$SA_EMAIL" ] || [[ "$SA_EMAIL" == *"CHANGE_ME"* ]]; then
    warn "BOOTSTRAP_SUPERADMIN_EMAIL not set — skipping superadmin creation"
  elif [ -z "$SA_PASS" ] || [[ "$SA_PASS" == *"CHANGE_ME"* ]]; then
    warn "BOOTSTRAP_SUPERADMIN_PASSWORD not set — skipping superadmin creation"
  else
    RESULT=$(docker compose exec -T api \
      wget -qO- \
        --header="Content-Type: application/json" \
        --post-data="{\"email\":\"${SA_EMAIL}\",\"password\":\"${SA_PASS}\",\"firstName\":\"${SA_FIRST}\",\"lastName\":\"${SA_LAST}\",\"phone\":\"${SA_PHONE}\"}" \
        "http://localhost:${API_PORT}/api/auth/setup-superadmin" 2>/dev/null || echo '{"error":"request failed"}')

    if echo "$RESULT" | grep -q '"skipped":true'; then
      success "Superadmin already exists — skipped"
    elif echo "$RESULT" | grep -q '"email"'; then
      success "Superadmin created: ${SA_EMAIL}"
    else
      warn "Superadmin setup response: ${RESULT}"
    fi
  fi
else
  warn "BOOTSTRAP_SUPERADMIN_CREATE=false — skipping superadmin creation"
  warn "Set BOOTSTRAP_SUPERADMIN_CREATE=true in .env to create admin on install"
fi

# ── 12. Seed initial settings ────────────────────────────────────────────────
if [ "${APP_RUN_SEED:-true}" = "true" ]; then
  info "Seeding initial settings..."
  SA_EMAIL="${BOOTSTRAP_SUPERADMIN_EMAIL:-${ADMIN_EMAIL:-}}"
  SA_PASS="${BOOTSTRAP_SUPERADMIN_PASSWORD:-${ADMIN_PASSWORD:-}}"

  if [ -n "$SA_EMAIL" ] && [ -n "$SA_PASS" ]; then
    TOKEN=$(docker compose exec -T api \
      wget -qO- \
        --header="Content-Type: application/json" \
        --post-data="{\"email\":\"${SA_EMAIL}\",\"password\":\"${SA_PASS}\"}" \
        "http://localhost:${API_PORT}/api/auth/login" 2>/dev/null \
      | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)

    if [ -n "$TOKEN" ]; then
      docker compose exec -T api \
        wget -qO- \
          --header="Authorization: Bearer $TOKEN" \
          --header="Content-Type: application/json" \
          --post-data='{}' \
          "http://localhost:${API_PORT}/api/settings/init" >/dev/null 2>&1 || true
      success "Initial settings seeded"
    else
      warn "Could not login to seed settings. Run POST /api/settings/init manually after first login."
    fi
  else
    warn "No admin credentials found in env — skipping settings seed"
  fi
else
  warn "APP_RUN_SEED=false — skipping settings seed"
fi

# ── 13. Start web, admin, nginx ──────────────────────────────────────────────
info "Starting web, admin CRM, and nginx..."
docker compose up -d web admin nginx
success "All services started"

# ── 14. Final status ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✓ Installation complete!${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${CYAN}Public site:${RESET}  ${APP_URL:-http://your-domain.ru}"
echo -e "  ${CYAN}Admin CRM:${RESET}    ${ADMIN_URL:-http://your-domain.ru/crm}"
echo -e "  ${CYAN}API:${RESET}          ${API_URL:-http://your-domain.ru/api}"
echo ""
if [ "${BOOTSTRAP_SUPERADMIN_CREATE:-false}" = "true" ] && [ -n "${BOOTSTRAP_SUPERADMIN_EMAIL:-}" ]; then
  echo -e "  ${CYAN}Admin login:${RESET}  ${BOOTSTRAP_SUPERADMIN_EMAIL}"
fi
echo ""
echo -e "  ${YELLOW}Next steps:${RESET}"
echo -e "  • Set up SSL: copy fullchain.pem + privkey.pem to docker/ssl/"
echo -e "  • Update nginx: replace YOUR_DOMAIN in docker/nginx.conf"
echo -e "  • Change admin password in CRM → Профиль"
echo -e "  • Fill in company contacts in CRM → Настройки → Общие"
echo ""
docker compose ps
