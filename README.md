# nanoboil

A Claude Code skill that takes an empty directory to a scaffolded, deployed and documented project. You answer a dozen questions, approve a recap, and come back to a repo you can start building in.

It is not a template repository. The skill runs the real CLIs (`create-next-app`, `gh`, `vercel`, `neon` or `supabase`) on your own accounts, so every project starts on current versions.

## Quick start

### 1. Install the command-line tools

You need [Claude Code](https://claude.com/claude-code), `git` and Node.js. Then:

```bash
npm install -g vercel neonctl
```

And the GitHub CLI: `brew install gh` on macOS, or [another system](https://github.com/cli/cli#installation).

Choosing Supabase instead of Neon? Install [its CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) instead of `neonctl`.

### 2. Log in, once

Each command opens your browser:

```bash
gh auth login
```

```bash
vercel login
```

```bash
neon auth
```

### 3. Install the skill

In Claude Code:

```
/plugin install nanoboil --marketplace guillaumesimon/nanoboil
```

On an older Claude Code, the same in two steps: `/plugin marketplace add guillaumesimon/nanoboil`, then `/plugin install nanoboil@nanoboil`.

### 4. Run it

```bash
mkdir my-project && cd my-project && claude
```

Then say:

```
set up this project
```

That is all. If a tool from step 1 or a login from step 2 is missing, the skill notices and gives you the exact command.

## What happens when you run it

| | Step | What you do |
|---|---|---|
| 1 | **Preflight** - checks the tools and what already exists in the directory | nothing |
| 2 | **Interview** - what you are building, then multiple-choice questions: stack, database, analytics, email | answer, about five minutes |
| 3 | **Recap** - the exact list of what will be created, and where | read it, say yes |
| 4 | **Execution** - creates everything, in order | nothing, you can walk away |
| 5 | **Report** - the repo URL, the live URL, and anything left for you | read it |

A page opens in your browser during the setup: the **companion panel**. It shows each step's progress and what is waiting for you. When a step needs an API key (your email provider's, for instance), you paste it there, never in the chat.

**Nothing is created before you say yes at step 3.**

## What you get

| | |
|---|---|
| **App** | Next.js with TypeScript and Tailwind by default, or a static site, or what you name |
| **GitHub** | a repository, private by default, with the first commit pushed |
| **Database** | Neon (with login managed by Neon Auth when your product has accounts) or Supabase, or none |
| **Hosting** | a Vercel project connected to the repo, already deployed |
| **Documents** | `CLAUDE.md`, `PRODUCT_VISION.md`, `CHANGELOG.md`: what Claude reads before it builds anything |
| **Analytics** | PostHog or Amplitude, with an `ANALYTICS.md` tracking plan and typed events |
| **Email** | Resend or Plunk, with a test email sent to you |
| **Cloud sessions** | Claude Code in the cloud works on the project, with the same tools as your machine |

Every part is optional: answer "none" and it is skipped.

## Good to know before you say yes

These are real resources on your accounts.

- **Your scaffold goes live.** The first deployment of a new Vercel project is a production deployment, and so is every later push to `main`. That is how Vercel works.
- **A database project is created** on Neon or Supabase, in an EU region unless you ask for another.
- **One test email is sent**, to your own address.
- **Cost.** These services all have a free tier, but what a new project costs depends on your own plans: check them.

## Common questions

**Can I run it on a project that already exists?** Yes. It looks at what is there and only does what is missing. It never overwrites a `CLAUDE.md` or another document you already have.

**Can I run it twice?** Yes, for the same reason. It is also how you add a piece later: say "add analytics" or "set up cloud sessions".

**Something failed halfway.** The skill stops, shows the error and deletes nothing. Fix the cause (usually an expired login), then say "continue the setup".

**I do not want Next.js / Neon / analytics.** Say so in the interview. Each question has other options, and "none".

**How do I undo it?** The skill never deletes anything, so removal is by hand: delete the GitHub repository, the Vercel project and the database project from their dashboards. The recap and the final report list each one by name.

**How do I uninstall the skill?** `/plugin uninstall nanoboil`.

## Optional extras

**Key vault.** If you start projects often, `vault` keeps the API keys of your own accounts (Neon, Supabase, fal.ai...) in one place, so no project asks for them again. It also makes cloud sessions need a single token. The skill works without it. Setup and security model: [references/vault.md](skills/project-setup/references/vault.md).

**Brand.** The interview can define a first brand (colours, type, tone) through a separate `brand-kit` skill. That skill is not published yet; without it the brand step is skipped.

## Make it yours

The skill's choices each live in one file you can edit. To edit them, install from a clone instead of the plugin:

```bash
git clone https://github.com/guillaumesimon/nanoboil.git
```

```bash
ln -s "$PWD/nanoboil/skills/project-setup" ~/.claude/skills/project-setup
```

- The rules every new project starts with: [templates/CLAUDE.md](skills/project-setup/templates/CLAUDE.md)
- Which database is recommended, and why: [references/neon.md](skills/project-setup/references/neon.md)
- How analytics events are named and typed: [templates/analytics/](skills/project-setup/templates/analytics/)
- The interview and the order of the steps: [SKILL.md](skills/project-setup/SKILL.md)

```
.claude-plugin/     plugin and marketplace manifests
skills/project-setup/
  SKILL.md          the flow: preflight, interview, recap, execute, documents, verify
  scripts/          preflight.sh, the companion panel (panel.mjs, panel.html), vault
  references/       one file per step or provider, read only when relevant
  templates/        the documents and code written into each project
  assets/cloud/     one-time kit for a Claude Code cloud environment
scripts/check.sh    repository checks, also run in CI
```

## Contributing

Issues and pull requests are welcome, especially for another provider or a system the preflight handles badly. Run `bash scripts/check.sh` before opening one.

Developed on macOS. The scripts are plain bash and Node.

## License

[MIT](LICENSE)
