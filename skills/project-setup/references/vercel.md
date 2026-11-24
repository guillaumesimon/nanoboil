# Vercel

Skip linking if preflight shows `vercel_project: linked` - but still check the git connection and the environment variables.

## What to expect

- **The first deployment of a new Vercel project is always a production deployment**, even from a plain `vercel` command. There is no way to make it a preview. Setup therefore puts the scaffold in production once; the recap must say so. Later CLI deployments are previews.
- **`vercel link` connects the GitHub repo by itself** when the directory has a GitHub remote. From then on every push to `main` deploys to production.
- `vercel link` also appends a `VERCEL_OIDC_TOKEN` to `.env.local`. It keeps what was already in the file.

## Link

```bash
vercel link --yes --project <name>
```

This creates the project if it does not exist and writes `.vercel/project.json`. If the account has several teams, add `--team <slug>`; ask the user which if it is not obvious from `vercel teams ls`. Confirm afterwards:

```bash
cat .vercel/project.json
```

## Environment variables

Values come from stdin so they never appear in the command line or the chat. Hold the value in a shell variable first: a slow command piped directly arrives after vercel has stopped waiting, and nothing is created.

```bash
value="$(<command that prints the value>)"
for env in production preview development; do
  printf '%s' "$value" | vercel env add <NAME> "$env"
done
unset value
```

- `production` and `preview` values are stored as **Secret** by default: hidden in the dashboard and **not returned by `vercel env pull`**.
- `development` values are stored as **Config**, and they are what `vercel env pull .env.local` writes. A variable that local development or a cloud session needs must exist for `development`.
- For a public value that should stay readable everywhere (`NEXT_PUBLIC_*`), add `--type config`.

### Project keys and the vault

The project's Vercel variables hold what the deployed app reads: the database URL, and the keys issued for this product (email provider, analytics, payments). The user adds a secret project key in the companion panel, which stores it here for the three environments - see "Two kinds of keys" in `panel.md`.

The user's vault, when they have one (`references/vault.md`), holds their own account keys, which you use to run CLIs during development (`vault run -- neon ...`). Without a vault, those keys are whatever the CLIs' own logins and the shell environment provide. Do not copy a key from the vault into a project as a matter of course. The one case where it is right is an account-level service the app itself calls at runtime (the app generates images with the user's fal.ai account, say), and only after asking the user, since it puts their personal key in the deployed app:

```bash
vault run -- sh -c 'for env in production preview development; do printf %s "$FAL_KEY" | vercel env add FAL_KEY "$env"; done'
```

The single quotes matter: the variable must be expanded by the inner shell, which has the key, not by yours, which does not. `vault run` leaves the Vercel link of the current directory alone, so `vercel` inside it targets this project. Run it from the project directory.

Then list them, names only:

```bash
vercel env ls
```

## First deployment

```bash
vercel --yes
vercel ls            # the deployment URL, its status and its environment
```

In a non-interactive shell `vercel` prints JSON, not a bare URL: read the URL from `vercel ls`. Never pass `--prod` yourself.

The status must be `Ready`. If the build failed, read the logs with `vercel inspect <deployment-url> --logs`, fix the cause, and deploy again. Preview deployments are protected by default: a 401 on the URL from `curl` means protection is on, not that the deployment is broken.

## Check the repo connection

```bash
vercel git connect
```

It normally answers that the repo is already connected (done by `vercel link`). Every push to `main` deploys to production and every other branch gets a preview. The user was told this in the recap.

## Out-of-date CLI

If the CLI warns it is outdated, tell the user the upgrade command (`pnpm add -g vercel@latest`) at the end of setup. Do not upgrade a global tool in the middle of a setup.
