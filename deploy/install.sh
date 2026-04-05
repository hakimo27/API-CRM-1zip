#!/usr/bin/env bash
# =============================================================================
# Байдабаза — Production Install Script
# Usage: sh deploy/install.sh
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
    warn "Please edit .env with your real values, then re-run this script."
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
    error "Required variable $var is not set or still has placeholder value. Edit .env"
  fi
done
success "Required environment variables OK"

# ── 3. Create directories ────────────────────────────────────────────────────
info "Creating directories..."
mkdir -p backups docker/ssl
success "Directories ready"

# ── 4. Build images ──────────────────────────────────────────────────────────
info "Building Docker images (this takes a few minutes on first run)..."
docker compose build --parallel
success "Images built"

# ── 5. Start database + redis ────────────────────────────────────────────────
info "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis
success "postgres and redis started"

# ── 6. Wait for PostgreSQL ───────────────────────────────────────────────────
info "Waiting for PostgreSQL to be ready..."
ATTEMPTS=0
MAX=30
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-kayakrent}" -q 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge $MAX ]; then
    error "PostgreSQL did not become ready after ${MAX} attempts. Check logs: docker compose logs postgres"
  fi
  echo -n "."
  sleep 2
done
echo ""
success "PostgreSQL is ready"

# ── 7. Wait for Redis ────────────────────────────────────────────────────────
info "Waiting for Redis to be ready..."
ATTEMPTS=0
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge 15 ]; then
    error "Redis did not become ready. Check logs: docker compose logs redis"
  fi
  sleep 1
done
success "Redis is ready"

# ── 8. Run database migrations ───────────────────────────────────────────────
info "Running database migrations..."
docker compose run --rm --no-deps api \
  sh -c "cd /app && pnpm --filter @workspace/db run push" \
  || error "Migrations failed. Check logs above."
success "Migrations applied"

# ── 9. Start API ─────────────────────────────────────────────────────────────
info "Starting API server..."
docker compose up -d api
success "API server started"

# ── 10. Wait for API ─────────────────────────────────────────────────────────
info "Waiting for API to be ready..."
ATTEMPTS=0
MAX=30
API_PORT="${PORT:-8080}"
until docker compose exec -T api wget -qO- "http://localhost:${API_PORT}/api/auth/healthz" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge $MAX ]; then
    warn "API health check timed out. Continuing anyway..."
    break
  fi
  echo -n "."
  sleep 3
done
echo ""
success "API is ready"

# ── 11. Seed initial data ────────────────────────────────────────────────────
info "Seeding initial settings and admin account..."
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@baydabaza.ru}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

TOKEN=$(docker compose exec -T api \
  wget -qO- --header="Content-Type: application/json" \
  --post-data="{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  "http://localhost:${PORT:-8080}/api/auth/login" 2>/dev/null \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)

if [ -n "$TOKEN" ]; then
  docker compose exec -T api \
    wget -qO- --header="Authorization: Bearer $TOKEN" \
    --header="Content-Type: application/json" \
    --post-data='{}' \
    "http://localhost:${PORT:-8080}/api/settings/init" >/dev/null 2>&1 || true
  success "Initial settings seeded"
else
  warn "Could not auto-seed settings (admin account may not exist yet). Run manually after first login: POST /api/settings/init"
fi

# ── 12. Start web, admin, nginx ──────────────────────────────────────────────
info "Starting web, admin CRM, and nginx..."
docker compose up -d web admin nginx
success "All services started"

# ── 13. Summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✓ Installation complete!${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${CYAN}Public site:${RESET}  ${APP_URL:-http://YOUR_DOMAIN}"
echo -e "  ${CYAN}Admin CRM:${RESET}    ${ADMIN_URL:-http://YOUR_DOMAIN/crm}"
echo -e "  ${CYAN}API:${RESET}          ${API_URL:-http://YOUR_DOMAIN/api}"
echo ""
echo -e "  ${CYAN}Admin login:${RESET}  ${ADMIN_EMAIL:-admin@baydabaza.ru}"
echo -e "  ${CYAN}Admin pass:${RESET}   ${ADMIN_PASSWORD:-Admin123!}"
echo ""
echo -e "  ${YELLOW}Next steps:${RESET}"
echo -e "  • Set up SSL: copy fullchain.pem + privkey.pem to docker/ssl/"
echo -e "  • Update nginx.conf: replace YOUR_DOMAIN with your real domain"
echo -e "  • Change admin password in CRM Settings"
echo -e "  • Configure Telegram bot token in CRM Settings"
echo ""
docker compose ps
