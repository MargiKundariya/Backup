#!/usr/bin/env bash
# backup.sh — Automated PostgreSQL backup to S3-compatible storage
#
# Retention: 7 daily + 4 weekly + 3 monthly backups.
# Schedule via cron: 0 2 * * * /opt/skin-mockup/infra/backup.sh
#
# Required env vars (set in /etc/environment or systemd unit):
#   POSTGRES_HOST        — e.g. localhost or Docker container IP
#   POSTGRES_PORT        — default 5432
#   POSTGRES_DB          — database name (default: postgres)
#   POSTGRES_USER        — database user
#   POSTGRES_PASSWORD    — database password
#   S3_BUCKET            — s3://mybucket/skin-mockup-backups
#   AWS_ACCESS_KEY_ID    — or Cloudflare R2 key
#   AWS_SECRET_ACCESS_KEY
#   AWS_ENDPOINT_URL     — Cloudflare R2: https://<account>.r2.cloudflarestorage.com

set -euo pipefail

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
WEEKDAY=$(date +%u)   # 1=Mon … 7=Sun
DAY=$(date +%d)        # 01-31
MONTH=$(date +%m)      # 01-12

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="/tmp/skin-mockup-backups"

mkdir -p "$BACKUP_DIR"
FILENAME="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

echo "[backup] Dumping database at $TIMESTAMP..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password \
  | gzip > "$FILENAME"

echo "[backup] Dump complete: $FILENAME ($(du -sh "$FILENAME" | cut -f1))"

# ── Determine backup category ─────────────────────────────────────────────────
if [ "$DAY" = "01" ]; then
  # Monthly backup on 1st of each month (keep 3)
  S3_KEY="monthly/backup_${MONTH}.sql.gz"
elif [ "$WEEKDAY" = "7" ]; then
  # Weekly backup on Sunday (keep 4)
  WEEK=$(date +%V)
  S3_KEY="weekly/backup_week${WEEK}.sql.gz"
else
  # Daily backup (keep 7 rolling)
  S3_KEY="daily/backup_${TIMESTAMP}.sql.gz"
fi

echo "[backup] Uploading to ${S3_BUCKET}/${S3_KEY}..."
aws s3 cp "$FILENAME" "${S3_BUCKET}/${S3_KEY}" \
  ${AWS_ENDPOINT_URL:+--endpoint-url "$AWS_ENDPOINT_URL"} \
  --storage-class STANDARD

# ── Prune old daily backups (keep 7) ─────────────────────────────────────────
echo "[backup] Pruning old daily backups..."
aws s3 ls "${S3_BUCKET}/daily/" \
  ${AWS_ENDPOINT_URL:+--endpoint-url "$AWS_ENDPOINT_URL"} \
  | sort -r | tail -n +8 | awk '{print $4}' | while read -r old; do
    aws s3 rm "${S3_BUCKET}/daily/${old}" \
      ${AWS_ENDPOINT_URL:+--endpoint-url "$AWS_ENDPOINT_URL"}
  done

# Clean up local temp file
rm -f "$FILENAME"
echo "[backup] Done."
