# GitHub

Skip entirely if preflight shows a `git_remote` already.

## Before creating

Check the name is free, so a clash is caught before anything is created:

```bash
gh repo view <owner>/<name> --json url 2>/dev/null
```

If it exists, stop and ask the user: use that repo, or pick another name. Never push into an existing repo without asking.

## First commit

```bash
git add -A
git status --short        # read it: no .env file, no secret, no node_modules
git commit -m "Initial setup"
```

## Create and push

The user approved this push in the recap.

```bash
gh repo create <name> --private --source . --remote origin --push --description "<one-line pitch>"
```

Use `--public` instead of `--private` if that is what the user chose. To create it under an organization, use `<org>/<name>`.

## Check

```bash
gh repo view --json url,visibility,defaultBranchRef
```

The default branch must be `main` and the visibility must match what was asked.
