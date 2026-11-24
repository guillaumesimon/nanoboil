# The key vault (optional)

`scripts/vault` is a 100-line shell script that keeps the API keys of the user's own accounts in one place: the `development` environment variables of a Vercel project created for that purpose. Nothing is written to disk; a command that needs keys is run through `vault run -- <command>` and gets them in its environment.

The setup works without it. It earns its place for someone who starts projects often, and above all for Claude Code cloud sessions: with a vault, the cloud environment needs a single variable (`VERCEL_TOKEN`) instead of one token per service.

## What goes in it

**Account keys only**: the user's own access to a service, the same for everything they build (Neon API key, Supabase access token, fal.ai, ElevenLabs, Anthropic). A key issued for one product (the email provider's key, Stripe, a webhook secret) is a project key and lives in that project's Vercel variables. `panel.md`, "Two kinds of keys", has the rule.

## Set it up

Only when the user asks for it. It creates a Vercel project on their account, so say so first.

```bash
mkdir -p ~/.claude/bin
cp <skill-dir>/scripts/vault ~/.claude/bin/vault && chmod +x ~/.claude/bin/vault
~/.claude/bin/vault init                      # creates the Vercel project "vault" and writes ~/.claude/vault.conf
```

- An account with several Vercel teams has no default in a non-interactive shell: `vault init` then lists the teams, and the user picks one with `vault init vault --team <slug>`.
- To reuse a project that already holds keys, pass its name: `vault init <name>`.
- `~/.claude/vault.conf` holds two ids (team and project), no secret.
- The skill looks for the script at `~/.claude/bin/vault`. Another location works by exporting `PROJECT_SETUP_VAULT=<path>`.

The user then adds keys in the companion panel, or themselves in a terminal, never in chat:

```bash
vault set NEON_API_KEY        # paste the value, then Ctrl-D
```

## Use it

```bash
vault ls                               # names only
vault run -- neon projects list --org-id <org-id>
vault run -- sh -c 'curl -H "Authorization: Bearer $SOME_KEY" ...'   # single quotes: the inner shell has the key
```

`vault run` removes its own Vercel ids from the command's environment, so a `vercel` call inside it targets the current directory's project, not the vault.

Never print a value (`echo`, `env`, `vercel env pull` on the vault project) and never write one into a file.

## In cloud sessions

`~/.claude` does not exist there, so the project carries a copy: `scripts/vault` and `scripts/vault.conf`, committed (`cloud.md`, layer 2). The cloud environment's `VERCEL_TOKEN` is what opens it.

## Security model

The vault is as protected as the Vercel account: anyone who can read that project's variables, or who holds a `VERCEL_TOKEN` with access to it, can read every key. Keys are stored as `development` variables because those are the ones Vercel hands back to the CLI. For a team, or for keys that need audit and rotation, a dedicated secrets manager is the right tool; the vault is a convenience for one person's own accounts.
