#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# migrate.sh — Apply unapplied database migrations in order.
#
# Usage:
#   ./infra/migrate.sh                   # connect via env vars
#   PGPASSWORD=secret ./infra/migrate.sh # explicit password
#
# Env vars (all optional, defaults shown):
#   PGHOST     = localhost
#   PGPORT     = 5432
#   PGUSER     = postgres
#   PGDATABASE = postgres
#   PGPASSWORD = (from env or .pgpass)
#
# The script is idempotent — already-applied migrations are skipped.
# Migrations are applied in lexicographic filename order.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/volumes/db/migrations" && pwd)"

PG="psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE"

echo "── SkinMockup DB Migrations ─────────────────────────────────"
echo "  host:  $PGHOST:$PGPORT"
echo "  db:    $PGDATABASE"
echo "  dir:   $MIGRATIONS_DIR"
echo "─────────────────────────────────────────────────────────────"

# Ensure tracking table exists (idempotent)
$PG -c "
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id         TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
" > /dev/null

# Apply each migration file in order
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  migration_id="$(basename "$file")"

  already_applied=$($PG -tAc \
    "SELECT COUNT(*) FROM public.schema_migrations WHERE id = '$migration_id'")

  if [ "$already_applied" -eq 0 ]; then
    echo "  → Applying $migration_id..."
    $PG -f "$file" > /dev/null
    $PG -c \
      "INSERT INTO public.schema_migrations (id) VALUES ('$migration_id');" > /dev/null
    echo "    ✓ done"
  else
    echo "  ↓ Skipping $migration_id (already applied)"
  fi
done

echo "─────────────────────────────────────────────────────────────"
echo "  Migrations complete."
