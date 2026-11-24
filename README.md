# nanoboil

A Claude Code skill that takes an empty directory to a scaffolded, deployed and documented project after a short interview. You answer a dozen questions once, approve a recap, and come back to a repo you can start building in.

It is not a template repository. Nothing is copied from a frozen starter: the skill runs the real CLIs (`create-next-app`, `gh`, `vercel`, `neon` or `supabase`) on your own accounts, so every project starts on current versions.

## What you get

| | |
|---|---|
| **App** | Next.js App Router with TypeScript and Tailwind by default, or a static site, or what you name |
| **GitHub** | a repository, private by default, with the first commit pushed |
| **Database** | Neon (with Neon Auth when the product has accounts) or Supabase, or none |
| **Hosting** | a Vercel project connected to the repo, with its environment variables |
| **Founding documents** | `CLAUDE.md`, `PRODUCT_VISION.md`, `CHANGELOG.md`: what later sessions read before they build |
| **Analytics** | PostHog or Amplitude, behind a typed wrapper, with an `ANALYTICS.md` tracking plan |
| **Email** | Resend or Plunk, behind one `sendEmail` function, with a test email sent to you |
| **Cloud sessions** | a session hook so Claude Code in the cloud has the same CLIs and keys as your machine |

Every part is optional, and the skill is safe to run twice: it looks at what exists and only does what is missing. That also makes it the way to finish a half-configured project.

## Before you run it

**It creates real resources on your accounts.** Before anything is created, the skill shows a recap and waits for a clear yes. Read it. In particular:

- the first deployment of a new Vercel project goes to **production**, and so does every later push to `main`. Vercel works that way; the first deployment is the bare scaffold;
- a database project is created on Neon or Supabase, in an EU region unless you say otherwise;
- one test email is sent, to your own address.

These services all have a free tier, but what a new project costs depends on your own plans: check them.

**API keys never pass through the chat.** A local companion panel opens beside the conversation: it shows the progress of each step and has a field for each key the project needs. It listens on `127.0.0.1` only.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- `git`, `node` and `npm` (or `pnpm`)
- [`gh`](https://cli.github.com) and [`vercel`](https://vercel.com/docs/cli), logged in
- [`neon`](https://neon.com/docs/reference/neon-cli) or [`supabase`](https://supabase.com/docs/guides/local-development/cli/getting-started), logged in, if you want a database

The skill starts with a preflight that reports what is missing and how to install it. Developed on macOS; the scripts are plain bash and Node and are checked on Linux in CI.

## Install

As a plugin:

```
/plugin install nanoboil --marketplace guillaumesimon/nanoboil
```

Or as a plain skill, from a clone, so that your edits apply immediately:

```bash
git clone https://github.com/guillaumesimon/nanoboil.git
ln -s "$PWD/nanoboil/skills/project-setup" ~/.claude/skills/project-setup
```

## Use

In a new, empty directory, start Claude Code and say "set up this project", or type `/project-setup`. The skill answers in the language you write in.

The flow: preflight, interview, recap and approval, execution, verification. All the questions come first, so you can walk away once you have approved the recap.

## Optional pieces

**Key vault.** `scripts/vault` keeps the API keys of your own accounts (Neon, Supabase, fal.ai...) in one Vercel project, and hands them to a command with `vault run -- <command>`. Nothing is written to disk. It is most useful with cloud sessions, where it replaces one token per service by a single `VERCEL_TOKEN`. See [references/vault.md](skills/project-setup/references/vault.md), including its security model. The skill works without it.

**Brand.** The interview can define a first brand (colours, type, tone) through a separate `brand-kit` skill. That skill is not published yet; without it the brand step is skipped and the project says plainly that its brand is not defined.

## Opinions

These are choices, not requirements. Each lives in one file you can edit.

- Neon is recommended before Supabase, and Neon Auth before a separate auth provider: [references/neon.md](skills/project-setup/references/neon.md).
- EU regions by default.
- Analytics events follow an object-action naming (`Project Created`) and go through a typed wrapper: [templates/analytics/](skills/project-setup/templates/analytics/).
- The rules every new project starts with: [templates/CLAUDE.md](skills/project-setup/templates/CLAUDE.md).

## Layout

```
.claude-plugin/     plugin and marketplace manifests
skills/project-setup/
  SKILL.md          the flow: preflight, interview, recap, execute, documents, verify
  scripts/          preflight.sh (CLI and project state), panel.mjs + panel.html (companion panel),
                    vault (optional key vault)
  references/       one file per step or provider, read only when relevant
  templates/        the documents and code written into each project
  assets/cloud/     one-time kit for a Claude Code cloud environment
scripts/check.sh    repository checks, also run in CI
```

## Contributing

Issues and pull requests are welcome, especially for another provider or a system the preflight handles badly. Run `bash scripts/check.sh` before opening one.

## License

[MIT](LICENSE)
