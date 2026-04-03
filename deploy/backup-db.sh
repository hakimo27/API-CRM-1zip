#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# КаякРент — PostgreSQL backup script
# Usage:
#   ./deploy/backup-db.sh                        # creates timestamped dump
#   ./deploy/backup-db.sh my-backup.sql          # custom filename
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

if [ -f ".env" ]; then
  set -a && source .env && set +a
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${1:-backup_${TIMESTAMP}.sql}"
BACKUP_DIR="./backups"

mkdir -p "$BACKUP_DIR"

echo "▶ Creating PostgreSQL dump → ${BACKUP_DIR}/${FILENAME}"

# Docker-compose: dump from running container
if command -v docker &> /dev/null; then
  docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-kayakrent}" \
    "${POSTGRES_DB:-kayakrent}" \
    > "${BACKUP_DIR}/${FILENAME}"
else
  # Direct pg_dump (requires DATABASE_URL)
  pg_dump "${DATABASE_URL}" > "${BACKUP_DIR}/${FILENAME}"
fi

gzip "${BACKUP_DIR}/${FILENAME}"
echo "✓ Backup saved: ${BACKUP_DIR}/${FILENAME}.gz"

# Keep only last 10 backups
ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
echo "✓ Old backups cleaned up (keeping last 10)"
