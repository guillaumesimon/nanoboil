#!/usr/bin/env bash
# Repository checks that need no dependency: manifests parse, each skill's frontmatter is valid,
# every file a skill mentions exists, and nothing personal slipped in.
# Usage: bash scripts/check.sh   (from the repository root)
set -u
fail=0
err() { echo "FAIL: $*"; fail=1; }

for f in .claude-plugin/plugin.json .claude-plugin/marketplace.json; do
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$f" 2>/dev/null || err "$f is not valid JSON"
done

for skill in skills/*/; do
  md="${skill}SKILL.md"
  [ -f "$md" ] || { err "$md is missing"; continue; }
  [ "$(head -1 "$md")" = "---" ] || err "$md does not start with frontmatter"
  name="$(sed -n 's/^name: //p' "$md" | head -1)"
  desc="$(sed -n 's/^description: //p' "$md" | head -1)"
  [ "$name" = "$(basename "$skill")" ] || err "$md: name \"$name\" does not match its directory"
  [ -n "$desc" ] || err "$md: description is empty"
  # The Agent Skills spec caps the description at 1024 characters.
  [ "${#desc}" -le 1024 ] || err "$md: description is ${#desc} characters, the limit is 1024"

  # Every references/, scripts/, templates/ or assets/ path named in the skill must exist.
  # Paths with a placeholder (<name>) or a glob are skipped, and so are paths written for
  # the generated project (scripts/cloud-session.sh, scripts/vault.conf).
  grep -rhoE '(references|scripts|templates|assets)/[A-Za-z0-9_./-]+' "$md" "${skill}references" 2>/dev/null \
    | sed 's/[.,:;)]*$//' | sort -u | while read -r path; do
      case "$path" in
        scripts/cloud-session.sh|scripts/vault.conf|assets/claude-md-block.md|references/quick.md) continue ;;
      esac
      [ -e "$skill$path" ] || echo "FAIL: $md mentions $path, which does not exist"
    done | grep . && fail=1
done

# Account ids and personal paths do not belong in a public skill.
if grep -rnE 'team_[A-Za-z0-9]{16,}|prj_[A-Za-z0-9]{16,}|/Users/[a-z]+/' skills .claude-plugin README.md 2>/dev/null; then
  err "an account id or a personal path is committed (lines above)"
fi

[ "$fail" = 0 ] && echo "ok"
exit "$fail"
