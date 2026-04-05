#!/usr/bin/env bash
# =============================================================================
# Байдабаза — Health Check Script
# Usage: sh deploy/healthcheck.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

if [ -f ".env" ]; then
  set -a && source .env && set +a
fi

BASE_URL="${APP_URL:-http://localhost}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${RESET} $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${RESET} $name"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo -e "${CYAN}═══════════════════════════════════════${RESET}"
echo -e "${CYAN}  Байдабаза — Health Check${RESET}"
echo -e "${CYAN}═══════════════════════════════════════${RESET}"
echo ""

echo -e "${CYAN}Docker services:${RESET}"
check "postgres"  "docker compose ps postgres | grep -q 'healthy\|running'"
check "redis"     "docker compose ps redis | grep -q 'healthy\|running'"
check "api"       "docker compose ps api | grep -q 'running'"
check "web"       "docker compose ps web | grep -q 'running'"
check "admin"     "docker compose ps admin | grep -q 'running'"
check "nginx"     "docker compose ps nginx | grep -q 'running'"

echo ""
echo -e "${CYAN}HTTP endpoints:${RESET}"
check "API healthz (${BASE_URL}/api/auth/healthz)"  "curl -sf '${BASE_URL}/api/auth/healthz'"
check "Public site (${BASE_URL}/)"                   "curl -sf -o /dev/null '${BASE_URL}/'"
check "Admin CRM (${BASE_URL}/crm/)"                 "curl -sf -o /dev/null '${BASE_URL}/crm/'"
check "Categories API"                                "curl -sf '${BASE_URL}/api/categories' | grep -q '\['"

echo ""
echo -e "${CYAN}Database:${RESET}"
check "PostgreSQL responding" "docker compose exec -T postgres pg_isready -U '${POSTGRES_USER:-kayakrent}' -q"

echo ""
echo -e "────────────────────────────────────────"
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}All checks passed (${PASS}/${PASS})${RESET}"
else
  echo -e "  ${YELLOW}${PASS} passed, ${RED}${FAIL} failed${RESET}"
  echo ""
  echo -e "  Run ${CYAN}docker compose logs <service>${RESET} to investigate."
fi
echo ""
