# Neon

The CLI binary is `neon` (also published as `neonctl`). Skip creation if preflight shows `neon: linked`.

## Before creating

```bash
neon orgs list
neon projects list --org-id <org-id> --output json     # a JSON array: jq -r '.[].name'
```

Always pass `--org-id` to `projects list` and `projects create`. Without it the CLI opens an interactive organization picker, which hangs or prints garbage in a non-interactive shell, even when there is only one organization.

If a project with the same name exists, ask the user whether to reuse it. The free plan limits the number of projects; if creation is refused for that reason, show the list and let the user decide what to do. Never delete a project to make room.

If the account belongs to several organizations, ask which one.

## Create

```bash
neon projects create --name <name> --org-id <org-id> --region-id aws-eu-central-1 --set-context --no-secrets --output json
```

- `--no-secrets` keeps the connection string out of the output, and so out of the chat.
- `--set-context` writes a `.neon` file that points later `neon` commands at this project. It holds ids, not secrets, and can be committed.
- Default to the EU region unless the user asked otherwise.

## Connection string

Never print it. Pipe it straight to where it goes.

Locally:

```bash
printf 'DATABASE_URL=%s\n' "$(neon connection-string --pooled)" >> .env.local
```

On Vercel, after the project is linked (see `vercel.md`), once per environment:

```bash
url="$(neon connection-string --pooled)"
for env in production preview development; do
  printf '%s' "$url" | vercel env add DATABASE_URL "$env"
done
unset url
```

Do not pipe `neon connection-string` straight into `vercel env add`: neon answers after vercel has stopped waiting for stdin, the variable is not created, and neon crashes with `EPIPE`. Hold the value in a shell variable as above; it is never printed.

Use the pooled string for the app. If the project runs migrations with a tool that needs a direct connection, add `DATABASE_URL_UNPOOLED` the same way without `--pooled`.

## Neon Auth

Only when the user chose "Neon + Neon Auth". Neon Auth is login managed by Neon (Managed Better Auth): users and sessions live in the `neon_auth` schema of the same database, and auth emails (verification, password reset) are sent by Neon, so login does not depend on the email step.

Setup enables the service and wires the app to it. It does **not** build the login screens: that is the first piece of product work, done after setup.

**Limits to check before enabling.** If one applies, tell the user and let them choose between Neon without auth and Supabase:

- AWS regions only (the default `aws-eu-central-1` is fine), and not on a project with IP Allow or Private Networking;
- no MFA, passkeys, SSO/SAML or phone-first sign-up. Email/password, email code, magic link and Google, GitHub, Microsoft, Apple, Discord and Vercel sign-in are offered.

**Enable**, on the project `.neon` points at:

```bash
neon neon-auth enable
neon neon-auth status --output json
```

**Wire the app.** If the `neon-auth` skill is available (Neon plugin), follow it for this part: it has the current package (`@neon/auth`), the exact environment variables and the route files, and it is kept up to date. Otherwise read https://neon.com/docs/auth/overview.md before writing anything; do not write the integration from memory.

Whatever the source, during setup do only this:

1. install the SDK;
2. put the auth variables the SDK needs (at least the Auth URL, `NEON_AUTH_BASE_URL`, read from the `status` output) in `.env.local` and in the three Vercel environments, the same way as `DATABASE_URL`. A generated secret is piped, never printed;
3. add the server handler and the client file the SDK needs, with no screens.

**Trusted domains**, after the Vercel step. Neon Auth only redirects to origins it knows; localhost is allowed by default. Add the production URL, with the scheme and without a trailing slash:

```bash
neon neon-auth domain add https://<project>.vercel.app
neon neon-auth domain list
```

Add the custom domain too if there is one. Preview deployments have changing URLs: say in the report that login will not work on a preview until its origin is added.

**Tell the next session.** In the project `CLAUDE.md`, `{{database_summary}}` says that auth is Neon Auth, that login screens are still to build, and that the `neon-auth` skill is the reference for it. In `PRODUCT_VISION.md` nothing changes.

**Before production use**, list in the report what the user will have to do later, without doing it now: their own OAuth apps for social sign-in (the shared Google credentials are for development only) and a custom SMTP sender. Source: https://neon.com/docs/auth/production-checklist.md

## Check

```bash
neon branches list
grep -c '^DATABASE_URL=' .env.local     # 1
neon neon-auth status                   # only with Neon Auth
```

Schema changes go through versioned migrations in the repo, not ad hoc SQL. Do not create tables during setup unless the user asked for a first schema.
