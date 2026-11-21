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

## Check

```bash
neon branches list
grep -c '^DATABASE_URL=' .env.local     # 1
```

Schema changes go through versioned migrations in the repo, not ad hoc SQL. Do not create tables during setup unless the user asked for a first schema.
