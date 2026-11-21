# Supabase

Skip `supabase init` if preflight shows `supabase: initialised`.

## Before creating

```bash
supabase orgs list
supabase projects list
```

- If there are several organizations, the user must have picked one in the interview. Do not guess.
- The free plan allows two active projects per organization. If creation is refused for that reason, show the organization's projects and let the user decide. Never pause or delete a project to make room without an explicit request.
- If a project with the same name exists in that organization, ask whether to reuse it.

## Create

Generate the database password into `.env.local` without displaying it, then pass it from there:

```bash
printf 'SUPABASE_DB_PASSWORD=%s\n' "$(openssl rand -base64 24 | tr -d '/+=')" >> .env.local
supabase projects create <name> --org-id <org-id> --region eu-west-1 \
  --db-password "$(grep '^SUPABASE_DB_PASSWORD=' .env.local | cut -d= -f2)"
```

Note the project ref from the output. The project takes a minute or two to become `ACTIVE_HEALTHY`; check with `supabase projects list` before linking.

## Local setup and link

```bash
supabase init
supabase link --project-ref <ref> --password "$(grep '^SUPABASE_DB_PASSWORD=' .env.local | cut -d= -f2)"
```

`supabase/config.toml` and `supabase/migrations/` are committed. `supabase/.temp` is not.

## Keys

The URL is `https://<ref>.supabase.co`. Read the keys without printing them:

```bash
supabase projects api-keys --project-ref <ref> --output json
```

Extract the publishable (anon) key with `jq` and write it straight into `.env.local` and Vercel. Typical variables for a Next.js app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` on older projects)

Add each to Vercel for `production`, `preview` and `development` with `vercel env add <NAME> <environment>` reading the value from stdin (see `vercel.md`). The publishable key is safe in the browser. The secret (service role) key is only added if the app has server code that needs it, as `--sensitive`, and never with a `NEXT_PUBLIC_` prefix.

## Rules

- Schema changes go through `supabase migration new <name>` and versioned files, not ad hoc SQL.
- Never run `supabase db reset` or `supabase db push` against the remote project without an explicit confirmation.
- Any table created in the `public` schema needs row level security enabled before it holds data.
