#!/bin/bash
# =============================================================================
# LiteBase Backup Script
# Dumps all project databases + litebase_meta
# Usage: ./scripts/backup.sh [output_dir]
# =============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="litebase-postgres-1"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting LiteBase backup..."

# Dump meta database
META_FILE="${BACKUP_DIR}/litebase_meta_${DATE}.sql.gz"
docker exec "$CONTAINER" pg_dump -U litebase litebase_meta | gzip > "$META_FILE"
echo "  Meta DB → $META_FILE ($(du -h "$META_FILE" | cut -f1))"

# Dump each project database
for DB in $(docker exec "$CONTAINER" psql -U litebase -d litebase_meta -t -A -c \
  "SELECT database_name FROM litebase.projects WHERE status = 'active'"); do
  FILE="${BACKUP_DIR}/${DB}_${DATE}.sql.gz"
  docker exec "$CONTAINER" pg_dump -U litebase "$DB" | gzip > "$FILE"
  echo "  $DB → $FILE ($(du -h "$FILE" | cut -f1))"
done

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup complete."
