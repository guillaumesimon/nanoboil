# Claude Code in the cloud

Goal: a cloud session (claude.ai/code, or "cloud" in the desktop app) on this project has the same working CLIs and API keys as the user's machine.

Two layers, with very different costs:

| Layer | Where it lives | How often | Who does it |
|---|---|---|---|
| **Environment** - CLIs installed, tokens, allowed domains | the user's Claude account | once, reused by every project | the user, by pasting what you prepare |
| **Project** - session hook, project ids, rules | the repo | every project | you, fully automated |

## What does and does not exist in a cloud session

Facts from the Claude Code docs (code.claude.com/docs/en/cloud-environments). Recheck there if something behaves differently.

- An environment can only be created and edited **in the UI**. There is no CLI, API or repo file for it. Do not look for one.
- Preinstalled: git, gh, node 22, npm, pnpm, bun, python, docker, jq, ripgrep, PostgreSQL 16 and Redis (installed, not started). **Not** preinstalled: vercel, neon, supabase.
- **Not available**: `~/.claude/CLAUDE.md`, `~/.claude/skills/`, user settings and user hooks, the macOS keychain. Only what is in the repo comes along: `CLAUDE.md`, `.claude/skills/`, `.claude/settings.json`.
- GitHub goes through a proxy: `git push` and `gh api` (REST) work, `gh pr` and `gh issue` (GraphQL) return 403. Setting `GH_TOKEN` does not change that.
- `CLAUDE_CODE_REMOTE` is `"true"` in the cloud and unset locally.
- Environment variables are readable by anyone who uses the environment. For a personal environment that is only the user.
- Outbound traffic goes through an HTTP/HTTPS proxy. Whether a direct Postgres connection (TCP 5432) gets through is **not documented** - `scripts/cloud-session.sh --check` tests it; do not promise it.

## Layer 1 - the environment (once)

Preflight prints `cloud_env:`. If it names an environment, this layer is done: skip to layer 2 and only tell the user which environment to pick. Check that the variables this project needs are in that environment (ask the user; you cannot read it).

Otherwise, walk the user through it. You cannot do this part for them, and you must not ask for token values in chat. Prepare everything so it is three pastes:

1. Copy the kit where the user can open it:

   ```bash
   mkdir -p .claude/cloud-kit && cp <skill-dir>/assets/cloud/* .claude/cloud-kit/
   ```

   Trim `env-vars.example` and `allowed-domains.txt` to the services this user actually has. Add `.claude/cloud-kit/` to `.gitignore`: it is a scratch area, and the user may type values into it.

2. Give the user these steps, with links to the three files:
   - open claude.ai/code, click the environment selector under the message box, then **New environment** (or the settings icon on an existing one);
   - **Name**: something personal and reusable, for example `dev`;
   - **Network access**: `Limited`, tick **Allow package managers**, paste `allowed-domains.txt` into **Allowed domains**. `Full` also works and needs no list, at the cost of letting sessions reach any host;
   - **Setup script**: paste `environment-setup.sh`;
   - **Environment variables**: paste `env-vars.example` and fill each value. The file has the page where each token is created. Tokens are created by the user, in their own browser. With a key vault (preflight `vault: ok`) the only variable is `VERCEL_TOKEN`.

   If the companion panel is running, put these as to-dos instead of files to open: one per paste, each with `--copy <file>` so the user gets a copy button, and one for the token with `--url https://vercel.com/account/tokens`.

   **Token scope, with a vault.** The vault is a Vercel project, so `VERCEL_TOKEN` is what opens it. A token limited to that one project gives cloud sessions every API key but cannot read the app's own variables (`vercel env pull` fails, so no `DATABASE_URL`). A token for the whole team does both. Explain the trade-off and let the user choose; the session script reports which case it is in.

3. When the user confirms, record the environment name so later projects skip this layer, then delete the kit:

   ```bash
   printf '%s\n' "<environment name>" > ~/.claude/project-setup-cloud-env
   rm -rf .claude/cloud-kit
   ```

If the user has no access to cloud sessions yet, `/web-setup` in the Claude Code CLI connects GitHub and creates a default environment.

## Layer 2 - the project (every time)

1. **Session script** - copy `templates/cloud/cloud-session.sh` to `scripts/cloud-session.sh`, `chmod +x`, and fill the placeholders:
   - `{{vercel_project}}`, `{{vercel_project_id}}`, `{{vercel_org_id}}` from `.vercel/project.json` (ids, not secrets);
   - `{{supabase_ref}}`: the project ref, or empty;
   - `{{extra_keys}}`: names of other variables the project needs (`FAL_KEY`...), or empty.
2. **Hook** - write `templates/cloud/settings.json` to `.claude/settings.json`. If the file exists, merge the `SessionStart` entry into it instead of replacing the file.
3. **Key vault** - if preflight shows `vault: ok`, copy the vault script into the repo so cloud sessions can use it, since `~/.claude` does not exist there:

   ```bash
   cp ~/.claude/bin/vault scripts/vault && chmod +x scripts/vault
   ~/.claude/bin/vault conf > scripts/vault.conf
   ```

   `vault.conf` holds two ids (the vault's Vercel team id and project id), no token: the script reads it from its own directory. In a public repo those ids become public; ask the user before committing it there. Cloud sessions then run `scripts/vault run -- <command>` for anything that needs a key (`scripts/vault run -- neon projects list --org-id ...`).
4. **Neon** - make sure `.neon` is committed: it is what points the CLI at the project in the cloud.
5. **Rules** - the user's global `CLAUDE.md` does not exist in the cloud. The project `CLAUDE.md` template has a "Cloud sessions" section; fill it, and carry over the rules from the user's global file that the project depends on (CLI safety rules), never personal details.
6. **Environment variables of the app** - they already live in Vercel; the session script pulls them into `.env.local` at session start. Nothing to copy by hand.
7. Run it locally once to catch mistakes before the first cloud session:

   ```bash
   bash scripts/cloud-session.sh --check
   ```

   Locally, token variables are usually unset (the CLIs use their own login), so "X is not set" lines are expected there. What matters is that the script runs without error and names the right project.

Commit `scripts/cloud-session.sh`, `scripts/vault` and `scripts/vault.conf` if there is a vault, and `.claude/settings.json` with the rest of the setup.

## Verify in the cloud

This can only be proven from a real cloud session. Tell the user the one thing to do: start a cloud session on the repo with the environment selected, and send `bash scripts/cloud-session.sh --check`. Every line should say `ok`; each failing line says what to fix (missing CLI: setup script; missing variable: environment variables; failed call: token or allowed domains).

Do not report the cloud setup as working until that check has been run. Report it as "configured, to be confirmed in a first cloud session".
