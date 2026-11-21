#!/usr/bin/env bash
# Prepares a Claude Code cloud session for this project, and checks that it works.
#
#   scripts/cloud-session.sh           run by the SessionStart hook; does nothing outside the cloud
#   scripts/cloud-session.sh --check   full diagnostic, runnable anywhere
#
# VERCEL_TOKEN comes from the cloud environment's variables. The other tokens (NEON_API_KEY,
# SUPABASE_ACCESS_TOKEN...) come either from those variables too, or from the key vault through
# scripts/coffre when the project has one: `scripts/coffre run -- <command>`.
# Nothing secret is stored in this file. Never prints a secret.
# Always exits 0: a broken tool must not block the session.

VERCEL_PROJECT_NAME="{{vercel_project}}"
VERCEL_PROJECT_ID="{{vercel_project_id}}"
VERCEL_ORG_ID="{{vercel_org_id}}"
SUPABASE_REF="{{supabase_ref}}"
EXTRA_KEYS="{{extra_keys}}"   # space-separated names of other variables the project needs, e.g. "FAL_KEY"

mode="hook"
[ "$1" = "--check" ] && mode="check"
if [ "$mode" = "hook" ] && [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0
have() { command -v "$1" >/dev/null 2>&1; }
neon_bin="$(command -v neon || command -v neonctl)"

# The key vault, when the project carries its script. Reachable only with a working Vercel login.
vault=""
if [ -x scripts/coffre ] && have vercel && scripts/coffre run -- true >/dev/null 2>&1; then
  vault="scripts/coffre"
fi

# --- prepare -----------------------------------------------------------------

if [ "$mode" = "hook" ]; then
  if [ -f package.json ] && [ ! -d node_modules ]; then
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile >/dev/null 2>&1
    else npm install >/dev/null 2>&1; fi
  fi

  # .vercel/ is gitignored, so recreate the link from the ids above.
  if [ -n "$VERCEL_PROJECT_ID" ] && [ ! -f .vercel/project.json ]; then
    mkdir -p .vercel
    printf '{"projectId":"%s","orgId":"%s","projectName":"%s"}\n' \
      "$VERCEL_PROJECT_ID" "$VERCEL_ORG_ID" "$VERCEL_PROJECT_NAME" > .vercel/project.json
  fi

  if [ -n "$VERCEL_TOKEN" ] && have vercel && [ -f .vercel/project.json ] && [ ! -f .env.local ]; then
    vercel env pull .env.local --yes >/dev/null 2>&1
  fi
fi

# --- report ------------------------------------------------------------------

echo "Cloud session status for $(basename "$(pwd)"):"

# report <label> <binary> <token variable> <auth command...>
report() {
  local label="$1" bin="$2" var="$3"; shift 3
  if [ -z "$bin" ] || ! have "$bin"; then
    echo "- $label: CLI not installed (add it to the environment's setup script)"
  elif [ -n "$var" ] && [ -z "${!var}" ]; then
    # No token in the environment: fine where the CLI has its own login, or where the vault has it.
    if [ "$CLAUDE_CODE_REMOTE" != "true" ] && "$@" >/dev/null 2>&1; then
      echo "- $label: ok here through the CLI's own login"
    elif [ "$var" != "VERCEL_TOKEN" ] && [ -n "$vault" ] && "$vault" run -- "$@" >/dev/null 2>&1; then
      echo "- $label: ok through the vault - run it as: scripts/coffre run -- $(basename "$bin") ..."
    elif [ "$var" != "VERCEL_TOKEN" ] && [ -n "$vault" ]; then
      echo "- $label: the vault is reachable but the call failed ($var missing from the vault, expired, or host not in allowed domains)"
    else
      echo "- $label: $var is not set in the environment variables"
    fi
  elif "$@" >/dev/null 2>&1; then
    echo "- $label: ok"
  else
    echo "- $label: installed and token set, but the call failed (expired token, or host not in allowed domains)"
  fi
}

# GitHub goes through the cloud proxy: git and `gh api` work, `gh pr` / `gh issue` (GraphQL) return 403.
report "github (gh api)" gh "" gh api user
[ -n "$VERCEL_PROJECT_ID" ] && report vercel vercel VERCEL_TOKEN vercel whoami
[ -f .neon ] && report neon "$neon_bin" NEON_API_KEY "$neon_bin" me
[ -n "$SUPABASE_REF" ] && report supabase supabase SUPABASE_ACCESS_TOKEN supabase projects list

if [ -x scripts/coffre ]; then
  if [ -n "$vault" ]; then echo "- key vault: ok (scripts/coffre run -- <command>)"
  else echo "- key vault: NOT reachable (VERCEL_TOKEN missing or expired, or vercel CLI not installed)"; fi
fi

for key in $EXTRA_KEYS; do
  if [ -n "${!key}" ]; then echo "- $key: set"
  elif [ -n "$vault" ] && "$vault" run -- sh -c "[ -n \"\${$key}\" ]" >/dev/null 2>&1; then echo "- $key: in the vault (scripts/coffre run -- <command>)"
  else echo "- $key: NOT set (add it to the vault, or to the environment variables)"; fi
done

if [ -f .env.local ]; then
  echo "- .env.local: present"
elif [ "$CLAUDE_CODE_REMOTE" = "true" ] && [ -n "$VERCEL_TOKEN" ] && [ -n "$VERCEL_PROJECT_ID" ]; then
  echo "- .env.local: absent - the token could not read this project's variables. A token limited to the vault project cannot; it needs access to the whole team."
else
  echo "- .env.local: absent"
fi

# --- deeper checks, only on request --------------------------------------------

if [ "$mode" = "check" ]; then
  echo
  echo "Database reachability:"
  url="$(grep -E '^(DATABASE_URL|POSTGRES_URL)=' .env.local 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')"
  if [ -z "$url" ]; then
    echo "- no DATABASE_URL in .env.local, skipped"
  else
    host="$(printf '%s' "$url" | sed -E 's#^[a-z]+://([^@]*@)?([^:/?]+).*#\2#')"
    # Bounded to 5 seconds: a filtered port otherwise hangs instead of failing.
    if python3 -c 'import socket,sys; socket.create_connection((sys.argv[1], 5432), timeout=5).close()' "$host" 2>/dev/null; then
      echo "- direct Postgres connection (port 5432): ok"
    else
      echo "- direct Postgres connection (port 5432): BLOCKED - use the provider's HTTP driver or API from cloud sessions, or the local Postgres (service postgresql start)"
    fi
    if curl -s -o /dev/null --max-time 10 "https://$host"; then
      echo "- HTTPS to the database host: ok"
    else
      echo "- HTTPS to the database host: BLOCKED - add it to the environment's allowed domains"
    fi
  fi
fi

exit 0
