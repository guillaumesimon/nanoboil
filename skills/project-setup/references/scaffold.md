# Scaffold

Only when there is no `package.json`. Scaffold **before** writing any other file: scaffolding tools refuse a directory that contains files they do not recognise.

## Next.js (default)

```bash
pnpm create next-app@latest . --yes --ts --tailwind --eslint --app --src-dir --use-pnpm --import-alias "@/*"
```

- `create-next-app` runs `git init` and makes a first commit itself. That is fine: keep it and commit on top.
- Recent versions also write an `AGENTS.md` with framework rules for coding agents. Keep it, and import it from the project `CLAUDE.md` with a line `@AGENTS.md` so Claude reads it too.
- If the directory name is not a valid npm package name (capitals, spaces), scaffold fails. Set `"name"` by scaffolding into a valid sibling name, or fix the directory name with the user first.
- Check the flags against `pnpm create next-app@latest --help` if the command rejects one; they change between major versions.

## Static site

No build tool: an `index.html`, a `styles.css`, and nothing else. Vercel serves it as is.

## Other stacks

Use the stack's own official scaffolding command in non-interactive mode. Read its `--help` first instead of guessing flags.

## After scaffolding

- Confirm it builds: `pnpm build`. A scaffold that does not build will fail on Vercel too, and it is much cheaper to find out now.
- Confirm `.gitignore` covers `.env*`, `.vercel` and `node_modules`. Add what is missing.
