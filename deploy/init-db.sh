#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# КаякРент — Database initialization script
# Run this once on first deploy (or after a fresh database).
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "▶ Loading environment..."
if [ -f ".env" ]; then
  set -a && source .env && set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is not set. Export it or create a .env file."
  exit 1
fi

echo "▶ Running database migrations (drizzle push)..."
pnpm --filter @workspace/db run push

echo "▶ Seeding default settings..."
TOKEN=$(curl -s -X POST "${API_URL:-http://localhost:8080}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL:-admin@kayak.ru}\",\"password\":\"${ADMIN_PASSWORD:-Admin123!}\"}" \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)

if [ -n "$TOKEN" ]; then
  curl -s -X POST "${API_URL:-http://localhost:8080}/api/settings/init" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  echo ""
  echo "✓ Settings seeded."
else
  echo "⚠ Could not get admin token. Run settings/init manually after first login."
fi

echo ""
echo "✓ Database initialization complete."
