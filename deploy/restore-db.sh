#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# КаякРент — PostgreSQL restore script
# Usage:
#   ./deploy/restore-db.sh ./backups/backup_20250101_120000.sql.gz
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

if [ -f ".env" ]; then
  set -a && source .env && set +a
fi

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "✗ File not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠ WARNING: This will DROP and recreate the database '${POSTGRES_DB:-kayakrent}'!"
read -r -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "▶ Restoring database from: $BACKUP_FILE"

if command -v docker &> /dev/null; then
  # Drop and recreate via docker compose
  docker compose exec -T postgres psql \
    -U "${POSTGRES_USER:-kayakrent}" \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-kayakrent};" \
    -c "CREATE DATABASE ${POSTGRES_DB:-kayakrent};"

  # Restore
  gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql \
    -U "${POSTGRES_USER:-kayakrent}" \
    "${POSTGRES_DB:-kayakrent}"
else
  gunzip -c "$BACKUP_FILE" | psql "${DATABASE_URL}"
fi

echo "✓ Database restored successfully."
echo "▶ Running migrations to ensure schema is up to date..."
pnpm --filter @workspace/db run push
echo "✓ Done."
