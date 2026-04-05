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

# ── 1. Check required host tools ─────────────────────────────────────────────
info "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker not found. Install: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || error "Docker Compose plugin not found."
command -v curl >/dev/null 2>&1 || error "curl not found. Install: apt install -y curl"
success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
success "Docker Compose $(docker compose version --short)"

# ── 2. Check .env ────────────────────────────────────────────────────────────
info "Checking .env..."
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env not found. Copying .env.example → .env"
    cp .env.example .env
    error "Edit .env with your real values, then re-run: bash deploy/install.sh"
  else
    error ".env file not found. Create it from .env.example"
  fi
fi

set -a && source .env && set +a
success ".env loaded"

# Check required variables (abort if placeholder values left)
for var in POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET SESSION_SECRET; do
  val="${!var:-}"
  if [ -z "$val" ] || [[ "$val" == *"CHANGE_ME"* ]]; then
    error "Variable $var is not set or still has placeholder value. Edit .env"
  fi
done
success "Required environment variables OK"

# ── 3. Create required directories ───────────────────────────────────────────
info "Creating directories..."
mkdir -p backups docker/ssl docker/certbot
success "Directories ready"

# ── 4. Build Docker images ────────────────────────────────────────────────────
info "Building Docker images (first run takes 5-15 minutes)..."
docker compose build --parallel
success "Images built"

# ── 5. Start postgres and redis ───────────────────────────────────────────────
info "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis
success "postgres and redis started"

# ── 6. Wait for PostgreSQL ────────────────────────────────────────────────────
info "Waiting for PostgreSQL to be ready..."
ATTEMPTS=0; MAX=30
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-baydabaza}" -q 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ "${ATTEMPTS}" -ge "${MAX}" ] && error "PostgreSQL not ready after ${MAX} attempts. Check: docker compose logs postgres"
  echo -n "."; sleep 2
done
echo ""; success "PostgreSQL is ready"

# ── 7. Wait for Redis ─────────────────────────────────────────────────────────
info "Waiting for Redis to be ready..."
REDIS_PASS="${REDIS_PASSWORD:-}"
ATTEMPTS=0; MAX=20
until docker compose exec -T redis redis-cli --no-auth-warning ${REDIS_PASS:+-a "$REDIS_PASS"} ping 2>/dev/null | grep -q PONG; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ "${ATTEMPTS}" -ge "${MAX}" ] && error "Redis not ready after ${MAX} attempts. Check: docker compose logs redis"
  echo -n "."; sleep 1
done
echo ""; success "Redis is ready"

# ── 8. Run database migrations ────────────────────────────────────────────────
if [ "${APP_RUN_MIGRATIONS:-true}" = "true" ]; then
  info "Running database migrations (drizzle push)..."
  # drizzle-kit is now in regular dependencies, available in the runtime image
  docker compose run --rm --no-deps \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-baydabaza}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-baydabaza}" \
    api \
    bash -c "cd /app && pnpm --filter @workspace/db run push" \
    || error "Migrations failed. Check logs above."
  success "Migrations applied"
else
  warn "APP_RUN_MIGRATIONS=false — skipping migrations"
fi

# ── 9. Start API server ───────────────────────────────────────────────────────
info "Starting API server..."
docker compose up -d api
success "API server started"

# ── 10. Wait for API (curl from host to exposed 127.0.0.1:8080) ───────────────
info "Waiting for API to be ready..."
ATTEMPTS=0; MAX=40
until curl -sf http://127.0.0.1:8080/api/auth/healthz >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "${ATTEMPTS}" -ge "${MAX}" ]; then
    warn "API health check timed out after ${MAX} attempts."
    warn "Check: docker compose logs api"
    warn "Continuing — API might still start..."
    break
  fi
  echo -n "."; sleep 3
done
echo ""; success "API is ready"

# ── 11. Create superadmin ─────────────────────────────────────────────────────
if [ "${BOOTSTRAP_SUPERADMIN_CREATE:-false}" = "true" ]; then
  info "Creating superadmin account..."
  SA_EMAIL="${BOOTSTRAP_SUPERADMIN_EMAIL:-}"
  SA_PASS="${BOOTSTRAP_SUPERADMIN_PASSWORD:-}"
  SA_FIRST="${BOOTSTRAP_SUPERADMIN_FIRST_NAME:-Администратор}"
  SA_LAST="${BOOTSTRAP_SUPERADMIN_LAST_NAME:-}"
  SA_PHONE="${BOOTSTRAP_SUPERADMIN_PHONE:-}"

  if [ -z "${SA_EMAIL}" ] || [[ "${SA_EMAIL}" == *"CHANGE_ME"* ]]; then
    warn "BOOTSTRAP_SUPERADMIN_EMAIL not set — skipping superadmin creation"
  elif [ -z "${SA_PASS}" ] || [[ "${SA_PASS}" == *"CHANGE_ME"* ]]; then
    warn "BOOTSTRAP_SUPERADMIN_PASSWORD not set — skipping superadmin creation"
  else
    # Use curl from host — API port 8080 is exposed on 127.0.0.1
    PAYLOAD="{\"email\":\"${SA_EMAIL}\",\"password\":\"${SA_PASS}\",\"firstName\":\"${SA_FIRST}\",\"lastName\":\"${SA_LAST}\",\"phone\":\"${SA_PHONE}\"}"
    RESULT=$(curl -sf -X POST \
      -H "Content-Type: application/json" \
      -d "${PAYLOAD}" \
      "http://127.0.0.1:8080/api/auth/setup-superadmin" 2>/dev/null || echo '{"error":"request_failed"}')

    if echo "${RESULT}" | grep -q '"skipped":true'; then
      success "Superadmin already exists — skipped"
    elif echo "${RESULT}" | grep -q '"email"'; then
      success "Superadmin created: ${SA_EMAIL}"
    else
      warn "Superadmin setup response: ${RESULT}"
      warn "You can create admin manually at: POST /api/auth/setup-superadmin"
    fi
  fi
else
  warn "BOOTSTRAP_SUPERADMIN_CREATE=false — skipping superadmin creation"
fi

# ── 12. Seed initial settings ─────────────────────────────────────────────────
if [ "${APP_RUN_SEED:-true}" = "true" ]; then
  info "Seeding initial settings..."
  SA_EMAIL="${BOOTSTRAP_SUPERADMIN_EMAIL:-}"
  SA_PASS="${BOOTSTRAP_SUPERADMIN_PASSWORD:-}"

  if [ -n "${SA_EMAIL}" ] && [ -n "${SA_PASS}" ] && [[ "${SA_PASS}" != *"CHANGE_ME"* ]]; then
    # Login to get access token
    LOGIN_PAYLOAD="{\"email\":\"${SA_EMAIL}\",\"password\":\"${SA_PASS}\"}"
    TOKEN=$(curl -sf -X POST \
      -H "Content-Type: application/json" \
      -d "${LOGIN_PAYLOAD}" \
      "http://127.0.0.1:8080/api/auth/login" 2>/dev/null \
      | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)

    if [ -n "${TOKEN}" ]; then
      curl -sf -X POST \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        "http://127.0.0.1:8080/api/settings/init" >/dev/null 2>&1 || true
      success "Initial settings seeded"
    else
      warn "Could not obtain auth token. Settings not seeded."
      warn "Run POST /api/settings/init via CRM → Settings after first login."
    fi
  else
    warn "No admin credentials configured — skipping settings seed"
  fi
else
  warn "APP_RUN_SEED=false — skipping settings seed"
fi

# ── 13. Demo seed ─────────────────────────────────────────────────────────────
if [ "${APP_RUN_DEMO_SEED:-false}" = "true" ]; then
  info "Running demo data seed (categories, products, tours, branches)..."
  SA_EMAIL="${BOOTSTRAP_SUPERADMIN_EMAIL:-}"
  SA_PASS="${BOOTSTRAP_SUPERADMIN_PASSWORD:-}"

  if [ -n "${SA_EMAIL}" ] && [ -n "${SA_PASS}" ] && [[ "${SA_PASS}" != *"CHANGE_ME"* ]]; then
    # Re-login (token may have expired)
    LOGIN_PAYLOAD="{\"email\":\"${SA_EMAIL}\",\"password\":\"${SA_PASS}\"}"
    TOKEN=$(curl -sf -X POST \
      -H "Content-Type: application/json" \
      -d "${LOGIN_PAYLOAD}" \
      "http://127.0.0.1:8080/api/auth/login" 2>/dev/null \
      | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)

    if [ -n "${TOKEN}" ]; then
      DEMO_RESULT=$(curl -sf -X POST \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        "http://127.0.0.1:8080/api/seed/demo" 2>/dev/null || echo '{"error":"seed_failed"}')

      if echo "${DEMO_RESULT}" | grep -q '"skipped":true'; then
        success "Demo data already exists — skipped"
      elif echo "${DEMO_RESULT}" | grep -q '"created"'; then
        success "Demo data seeded successfully"
      else
        warn "Demo seed response: ${DEMO_RESULT}"
      fi
    else
      warn "Could not authenticate for demo seed. Run POST /api/seed/demo manually."
    fi
  else
    warn "No admin credentials — skipping demo seed"
  fi
else
  warn "APP_RUN_DEMO_SEED=false — skipping demo seed (expected for production)"
fi

# ── 14. Start web, admin, nginx ───────────────────────────────────────────────
info "Starting web, admin CRM, and nginx..."
docker compose up -d web admin nginx
success "All services started"

# ── 15. Final status ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✓ Installation complete!${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${CYAN}Public site:${RESET}  ${APP_URL:-http://YOUR_SERVER_IP}"
echo -e "  ${CYAN}Admin CRM:${RESET}    ${APP_URL:-http://YOUR_SERVER_IP}/crm"
echo -e "  ${CYAN}API:${RESET}          ${APP_URL:-http://YOUR_SERVER_IP}/api"
echo ""
if [ "${BOOTSTRAP_SUPERADMIN_CREATE:-false}" = "true" ] && [ -n "${BOOTSTRAP_SUPERADMIN_EMAIL:-}" ]; then
  echo -e "  ${CYAN}Admin login:${RESET}  ${BOOTSTRAP_SUPERADMIN_EMAIL}"
fi
echo ""
echo -e "  ${YELLOW}Next steps:${RESET}"
echo -e "  • SSL: bash deploy/enable-ssl.sh YOUR_DOMAIN"
echo -e "  • Change admin password: CRM → Профиль"
echo -e "  • Fill contacts: CRM → Настройки → Общие"
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}"
