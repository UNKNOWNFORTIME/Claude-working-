#!/usr/bin/env bash
# Creates a compressed, timestamped pg_dump of the Mindspace database.
#   npm run backup            -> ./backups/mindspace-YYYYmmdd-HHMMSS.sql.gz
#   BACKUP_DIR=/mnt/nas npm run backup
#   KEEP=30 npm run backup    -> keep only the 30 most recent backups
# Restore with:  gunzip -c backups/<file>.sql.gz | psql "$DATABASE_URL"
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"
DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"
mkdir -p "$DIR"
FILE="$DIR/mindspace-$(date +%Y%m%d-%H%M%S).sql.gz"
# pg_dump does not understand Prisma's ?schema= parameter
pg_dump --no-owner --no-privileges "${DATABASE_URL%%\?*}" | gzip > "$FILE"
echo "✓ Backup written to $FILE ($(du -h "$FILE" | cut -f1))"
ls -1t "$DIR"/mindspace-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
