#!/usr/bin/env bash
# Preflight for project-setup: reports which CLIs are installed and logged in,
# and what already exists in the target directory, so the skill can skip done steps.
#
# Usage: preflight.sh [project-dir]
# Output: one "key: value" line per fact. Never prints tokens or secrets.
# Exit code is always 0; read the lines, not the status.

dir="${1:-.}"
cd "$dir" 2>/dev/null || { echo "dir: MISSING ($dir)"; exit 0; }

echo "## tools"

have() { command -v "$1" >/dev/null 2>&1; }

for tool in git node pnpm npm; do
  if have "$tool"; then
    echo "$tool: ok ($("$tool" --version 2>/dev/null | head -1))"
  else
    echo "$tool: MISSING"
  fi
done

# check <name> <binary> <install hint> <login hint> <auth command...>
check() {
  local name="$1" bin="$2" install="$3" login="$4"
  shift 4
  if ! have "$bin"; then
    echo "$name: MISSING - install with: $install"
    return
  fi
  local out
  if out="$("$@" 2>&1)"; then
    echo "$name: ok"
  else
    echo "$name: NOT_LOGGED_IN - run: $login"
  fi
}

check gh       gh       "brew install gh"                "gh auth login"   gh auth status
check vercel   vercel   "pnpm add -g vercel@latest"      "vercel login"    vercel whoami
check neon     neon     "brew install neonctl"           "neon auth"       neon me
check supabase supabase "brew install supabase/tap/supabase" "supabase login" supabase projects list

if have gh; then
  login="$(gh api user --jq .login 2>/dev/null)"
  [ -n "$login" ] && echo "gh_user: $login"
fi
if have vercel; then
  scope="$(vercel whoami 2>/dev/null | tail -1)"
  [ -n "$scope" ] && echo "vercel_user: $scope"
fi

# The user's API key vault, if they have one. Names only, never values.
if [ -x "$HOME/.claude/bin/coffre" ]; then
  if names="$("$HOME/.claude/bin/coffre" ls 2>/dev/null | awk '$1 ~ /^[A-Z][A-Z0-9_]+$/ && NF > 2 {print $1}' | sort | tr '\n' ' ')" && [ -n "$names" ]; then
    echo "vault: ok (~/.claude/bin/coffre)"
    echo "vault_keys: $names"
  else
    echo "vault: UNREACHABLE (~/.claude/bin/coffre exists but could not list keys; check vercel login)"
  fi
else
  echo "vault: none"
fi

echo
echo "## project ($(pwd))"

entries="$(ls -A 2>/dev/null | grep -v '^\.DS_Store$' | wc -l | tr -d ' ')"
echo "files_in_dir: $entries"

# A directory nested in another repository is not a repository of its own.
if [ "$(git rev-parse --show-toplevel 2>/dev/null)" = "$(pwd -P)" ]; then
  echo "git: initialised (branch $(git branch --show-current 2>/dev/null), $(git rev-list --count HEAD 2>/dev/null || echo 0) commits)"
  remote="$(git remote get-url origin 2>/dev/null)"
  echo "git_remote: ${remote:-none}"
else
  parent="$(git rev-parse --show-toplevel 2>/dev/null)"
  if [ -n "$parent" ]; then
    echo "git: none (WARNING: this directory is inside another repository, $parent)"
  else
    echo "git: none"
  fi
  echo "git_remote: none"
fi

[ -f package.json ] && echo "package_json: yes" || echo "package_json: no"

if [ -f .vercel/project.json ]; then
  echo "vercel_project: linked ($(grep -o '"projectName":"[^"]*"' .vercel/project.json | cut -d'"' -f4))"
else
  echo "vercel_project: not linked"
fi

[ -f .neon ] && echo "neon: linked" || echo "neon: not linked"
[ -f supabase/config.toml ] && echo "supabase: initialised" || echo "supabase: not initialised"

for f in CLAUDE.md PRODUCT_VISION.md CHANGELOG.md ANALYTICS.md .env.local .gitignore; do
  [ -f "$f" ] && echo "$f: exists" || echo "$f: absent"
done

if [ -f brand/tokens.json ]; then
  grep -q '"mode": *"quick"' brand/tokens.json && echo "brand: quick kit" || echo "brand: full kit"
elif [ -f BRAND.md ]; then
  echo "brand: one-page BRAND.md (older setup)"
else
  echo "brand: none"
fi

[ -f scripts/cloud-session.sh ] && echo "cloud_session_script: present" || echo "cloud_session_script: absent"
if [ -f .claude/settings.json ] && grep -q 'cloud-session.sh' .claude/settings.json; then
  echo "cloud_hook: present"
else
  echo "cloud_hook: absent"
fi
# Name of the personal cloud environment, recorded the first time it was set up.
if [ -s "$HOME/.claude/project-setup-cloud-env" ]; then
  echo "cloud_env: $(head -1 "$HOME/.claude/project-setup-cloud-env")"
else
  echo "cloud_env: none (one-time environment setup needed, see references/cloud.md)"
fi

if [ -f .gitignore ] && grep -q '\.env' .gitignore; then
  echo "env_gitignored: yes"
else
  echo "env_gitignored: NO"
fi
