#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-secrets.sh
# Generates a .env file with cryptographically random credentials for the
# Supabase self-hosted stack.  Safe to re-run — will NOT overwrite an existing
# .env unless you pass --force.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ -f "$ENV_FILE" && "${1:-}" != "--force" ]]; then
  echo "✅  $ENV_FILE already exists.  Pass --force to regenerate."
  exit 0
fi

echo "🔐  Generating secrets with openssl..."

# ── Helpers ─────────────────────────────────────────────────────────────────
rand_hex()  { openssl rand -hex "$1"; }
rand_b64()  { openssl rand -base64 "$1" | tr -d '\n/+='; }

# ── Core secrets ─────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=$(rand_hex 24)
JWT_SECRET=$(rand_hex 40)          # ≥ 32 chars required by GoTrue
DASHBOARD_PASSWORD=$(rand_hex 16)
LOGFLARE_API_KEY=$(rand_b64 24)
SECRET_KEY_BASE=$(rand_hex 64)     # for Realtime / Phoenix

# ── JWT helper (HS256, pure bash + openssl) ────────────────────────────────
# Args: <secret> <payload_json>
jwt_hs256() {
  local secret="$1"
  local payload="$2"

  local header='{"alg":"HS256","typ":"JWT"}'

  b64url() {
    echo -n "$1" | openssl base64 -A | tr '+/' '-_' | tr -d '='
  }

  local h; h=$(b64url "$header")
  local p; p=$(b64url "$payload")
  local signing_input="${h}.${p}"

  local sig
  sig=$(printf '%s' "$signing_input" \
    | openssl dgst -sha256 -hmac "$secret" -binary \
    | openssl base64 -A | tr '+/' '-_' | tr -d '=')

  echo "${signing_input}.${sig}"
}

# Expiry: 2099-01-01 (unix timestamp 4070908800) — rotate before then in prod
IAT=1700000000
EXP=4070908800

ANON_PAYLOAD="{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":${IAT},\"exp\":${EXP}}"
SERVICE_PAYLOAD="{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":${IAT},\"exp\":${EXP}}"

ANON_KEY=$(jwt_hs256 "$JWT_SECRET" "$ANON_PAYLOAD")
SERVICE_ROLE_KEY=$(jwt_hs256 "$JWT_SECRET" "$SERVICE_PAYLOAD")

# ── Write .env ────────────────────────────────────────────────────────────────
cat > "$ENV_FILE" <<EOF
# ─────────────────────────────────────────────────────────────────────────────
# AUTO-GENERATED — do not commit this file.
# Regenerate: ./generate-secrets.sh --force
# ─────────────────────────────────────────────────────────────────────────────

# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ── JWT / API keys ────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# ── Studio dashboard ──────────────────────────────────────────────────────────
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}

# ── Supabase API (Kong gateway) ───────────────────────────────────────────────
SUPABASE_PUBLIC_URL=http://localhost:8000

# ── GoTrue (Auth) ─────────────────────────────────────────────────────────────
SITE_URL=http://localhost:3000
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=http://localhost:8000

# ── Email (dev: use Inbucket, swap for SMTP in prod) ─────────────────────────
SMTP_ADMIN_EMAIL=admin@example.com
SMTP_HOST=inbucket
SMTP_PORT=2500
SMTP_SENDER_NAME=SkinMockup
ENABLE_EMAIL_AUTOCONFIRM=true

# ── Storage ───────────────────────────────────────────────────────────────────
STORAGE_BACKEND=file
GLOBAL_S3_BUCKET=stub            # only used for s3 backend
REGION=us-east-1

# ── Realtime ──────────────────────────────────────────────────────────────────
SECRET_KEY_BASE=${SECRET_KEY_BASE}

# ── Logflare (optional) ───────────────────────────────────────────────────────
LOGFLARE_API_KEY=${LOGFLARE_API_KEY}
LOGFLARE_URL=http://analytics:4000
EOF

echo "✅  Secrets written to $ENV_FILE"
echo ""
echo "   POSTGRES_PASSWORD  = ${POSTGRES_PASSWORD:0:8}..."
echo "   JWT_SECRET         = ${JWT_SECRET:0:8}..."
echo "   ANON_KEY           = ${ANON_KEY:0:32}..."
echo "   SERVICE_ROLE_KEY   = ${SERVICE_ROLE_KEY:0:32}..."
echo "   DASHBOARD_PASSWORD = ${DASHBOARD_PASSWORD}"
echo ""
echo "   Copy ANON_KEY and SERVICE_ROLE_KEY to the Next.js .env.local"
