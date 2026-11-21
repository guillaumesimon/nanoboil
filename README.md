# nanoboil

Source of the `project-setup` skill for Claude Code: from an empty directory to a scaffolded, deployed and documented project - with analytics, email and working Claude Code cloud sessions - after a short interview.

## Use

In a new project directory, type `/project-setup` or say "fais-moi le setup".

## Install

The skill is symlinked into the personal skills directory, so edits here apply everywhere immediately:

```bash
ln -s "$PWD/skills/project-setup" ~/.claude/skills/project-setup
```

## Layout

```
skills/project-setup/
  SKILL.md          the flow: preflight, interview, recap, execute, documents, verify
  scripts/          preflight.sh - CLI and project state check
  references/       one file per step or provider, read only when relevant:
                    scaffold, github, neon, supabase, vercel, analytics, email, cloud
  templates/        CLAUDE.md, PRODUCT_VISION.md, BRAND.md, CHANGELOG.md
    analytics/      ANALYTICS.md (tracking plan), typed events, PostHog and Amplitude wrappers
    cloud/          session hook and script committed in each project
  assets/cloud/     one-time kit for the Claude Code cloud environment:
                    setup script, allowed domains, environment variables
```

To change the rules every new project starts with, edit `templates/CLAUDE.md`.
