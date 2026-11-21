#!/bin/bash
# Setup script for a personal Claude Code cloud environment.
# Paste the whole file into the environment's "Setup script" field (claude.ai/code > environment
# selector > settings). It runs once as root on Ubuntu, then the result is cached as a snapshot.
#
# It installs the CLIs the cloud image does not ship: vercel, neon, supabase.
# git, gh, node, pnpm, python, docker, jq and ripgrep are already in the image.
#
# A failing step must not block the session (a non-zero exit fails session start), so each
# install is tolerant. The per-project session script reports anything still missing.

install() {
  local label="$1"; shift
  if "$@" >/tmp/setup-"$label".log 2>&1; then
    echo "ok: $label"
  else
    echo "WARN: $label failed, see /tmp/setup-$label.log"
  fi
}

install vercel   npm install -g vercel@latest
install neon     npm install -g neonctl@latest
install supabase bash -c 'curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin supabase'

exit 0
