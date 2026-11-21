---
name: project-setup
description: Bootstrap a new small project end to end from a short interview - verify the CLIs, scaffold the app, create the GitHub repo, create the database (Neon or Supabase), set up and link the Vercel project, write the founding documents (CLAUDE.md, PRODUCT_VISION.md, BRAND.md, CHANGELOG.md), set up product analytics (PostHog or Amplitude) with an ANALYTICS.md tracking plan built on the object-action framework, typed events and user identify, set up transactional email (Resend or Plunk), and make the project work in Claude Code cloud sessions with the same CLIs and API keys as locally. Use this skill whenever the user says "fais-moi le setup", "setup du projet", "lance un nouveau projet", "nouveau projet", "boilerplate", "bootstrap this project", "set up this project", "start a new project", or opens an empty or nearly empty directory and wants to start building. Also use it to finish a half-configured project (repo exists but no Vercel project, no database, missing founding documents, or cloud sessions where the CLIs and APIs do not work - "setup cloud", "Claude Code dans le cloud", "ça ne marche pas dans le cloud" - or with no analytics or email yet - "ajoute les analytics", "setup PostHog", "setup Amplitude", "tracking plan", "setup Resend", "setup Plunk") - the skill detects what exists and only does what is missing.
---

# Project setup

Take an empty directory to a deployed, documented starting point: app scaffold, GitHub repo, database, Vercel project, founding documents that later sessions read before they build, analytics with a tracking plan, email, and a repo that works in Claude Code cloud sessions.

The user runs this at the start of every small project. What they want is to answer a few questions once and then start working, with nothing left to wire up by hand. Two things make that work:

- **Ask everything first, then act.** All questions come before any resource is created, so the user can walk away during execution.
- **Check before you create.** Every step looks at what exists and skips what is done. The skill must be safe to run twice, and safe to run on a project that is half set up.

Write the generated documents, and talk to the user, in the language the user writes in.

## 1. Preflight

Run the preflight script on the project directory and read its output:

```bash
bash <skill-dir>/scripts/preflight.sh .
```

It reports each CLI as `ok`, `MISSING` (with the install command) or `NOT_LOGGED_IN` (with the login command), then what already exists in the directory.

- `MISSING`: install it yourself with the command given, then rerun the script.
- `NOT_LOGGED_IN`: logins are interactive. Give the user the exact command to run and wait. Do not work around a missing login.
- Only the database CLI the user ends up choosing has to be `ok`. Do not block on the other one.

If the directory already has files, a remote, or a linked Vercel project, tell the user what you found and that you will only do what is missing.

Preflight also prints `vault:`. When it is `ok`, the user keeps their API keys in a vault (`~/.claude/bin/coffre`) and `vault_keys:` lists the names already there: never ask for a key that is in that list.

## 1b. Companion panel

Start the companion panel now and open it for the user - see `references/panel.md`. It is a local page that shows the steps as they run, the API keys this project needs (present in the vault or missing, with a field to add a missing one), and what is left for the user to do. Keep it current for the rest of the setup: declare the steps, keys and to-dos once the interview is over, and update each step when it starts and when it ends.

Keys are added by the user in the panel, never in chat. The panel is a convenience: if it cannot start, continue without it.

## 2. Interview

Skip anything the user already told you, and anything preflight already answers. Infer what you can (project name from the directory name) and ask the user to confirm it instead of asking from scratch.

**In plain chat, in one message** (these need free text):

1. What are you building, in a sentence or two, and who is it for?
2. Project name (propose the directory name).

**Then with AskUserQuestion.** It takes four questions per call, so this is two calls:

*Call 1 - infrastructure*

3. **Stack** - Next.js App Router with TypeScript and Tailwind (default) / static site / other. If other, ask what.
4. **Database** - Neon (plain Postgres, default when the app only needs a database) / Supabase (when it also needs auth, storage or realtime) / none.
5. **Repository** - private (default) / public.
6. **Cloud sessions** - yes (default) / no. Whether Claude Code in the cloud should work on this project. Do not ask if preflight shows `cloud_session_script: present`.

*Call 2 - product tooling*

7. **Analytics** - PostHog / Amplitude / none. Do not ask if preflight shows `ANALYTICS.md: exists`.
8. **Email** - Resend / Plunk / none. If not none, ask in chat afterwards which domain to send from, or whether there is none yet.
9. **Brand depth** - light (three questions now, a one-page BRAND.md) / full (run the `brand-kit` skill after setup) / skip for now.

**Then the product and brand questions, in one AskUserQuestion call.** Offer concrete options built from what the user said about the product - people choose well between options and describe badly from scratch:

10. The one problem this solves better than what exists (offer two or three phrasings).
11. What it deliberately will not do in v1 (offer likely non-goals, multi-select).
12. If brand depth is light: tone of voice, and visual feel. Offer three or four contrasted directions for each, each described by what it looks or sounds like, not by adjectives like "modern" or "clean".

If Supabase is chosen and the account has several organizations, list them (`supabase orgs list`) and ask which one.

## 3. Recap and approval

Before creating anything, show one short recap and wait for a clear yes. These are real resources on the user's accounts.

State exactly:

- the GitHub repo that will be created (`owner/name`, visibility) and that the first commit will be **pushed** to it;
- the database project that will be created (provider, name, region - default to an EU region);
- the Vercel project that will be created and linked, that its **first deployment goes to production** (Vercel always does this on a new project; it will be the bare scaffold), and that **every later push to `main` deploys to production**;
- the analytics project and the email provider, what the user will have to do themselves (verify the sending domain; add the email API key in the panel if the vault does not have it yet), and that one test email will be sent to their own address;
- the keys the project needs: which are already in the vault, and which are waiting for the user in the panel;
- if cloud sessions were chosen: the session hook that will be committed in `.claude/settings.json`, and whether the user has a one-time environment to create (preflight `cloud_env: none`);
- the files that will be written, and anything preflight found that will be left untouched.

## 4. Execute

Run the steps in this order. The order matters: scaffolding tools refuse a directory that already contains unknown files, and Vercel needs the repo to exist before it can connect to it.

1. **Scaffold** the app if there is no `package.json` - see `references/scaffold.md`.
2. **Git** - `git init -b main` if needed. Make sure `.gitignore` covers `.env*`, `.vercel` and `node_modules` before the first commit.
3. **Founding documents** - step 5 below. Written before the first commit so the repo starts with them.
4. **First commit**, then **GitHub** - see `references/github.md`.
5. **Database** - read `references/neon.md` or `references/supabase.md`, whichever was chosen. Skip if none.
6. **Vercel** - see `references/vercel.md`: link (which also connects the repo), environment variables, first deployment.
7. **Analytics** - see `references/analytics.md`. Skip if none.
8. **Email** - see `references/email.md`. Skip if none.
9. **Cloud sessions** - see `references/cloud.md`. Skip if the user said no. It comes last because it needs the Vercel and database ids and the list of services in use.

Steps 7 to 9 add code and files after the first push: commit them and push again at the end, as one or several commits. That push deploys to production now that the repo is connected, which the recap announced.

Secrets (connection strings, API keys, database passwords) never appear in chat, in a commit or in a document. Pipe them from one command into the next, or into `.env.local`. API keys come from the vault (`coffre run -- <command>`); a missing one is added by the user in the panel.

A step that waits for a key does not block the others: mark it in the panel, do everything else, and come back to it.

If a step fails, stop, show the error, and fix the cause. Do not continue to later steps that depend on it, and do not delete what earlier steps created.

## 5. Founding documents

Fill the templates in `<skill-dir>/templates/` from the interview answers and write them at the project root. Replace every `{{placeholder}}`; remove a section rather than leave it empty or pad it. Keep the user's own words where they gave them.

| File | Source | Content |
|---|---|---|
| `PRODUCT_VISION.md` | `templates/PRODUCT_VISION.md` | what it is, who it is for, the problem, v1 scope, non-goals |
| `BRAND.md` | `templates/BRAND.md` | tone of voice, visual direction, do and don't. Skip if brand depth is "skip" or "full" |
| `CHANGELOG.md` | `templates/CHANGELOG.md` | first entry: the setup itself, with today's date |
| `ANALYTICS.md` | `templates/analytics/ANALYTICS.md` | the tracking plan: objects, actions, events, properties, identity. Written in the analytics step, see `references/analytics.md` |
| `CLAUDE.md` | `templates/CLAUDE.md` | project rules: read the vision and brand before building, maintain the changelog, stack and commands |

Never overwrite one of these files if it already exists. If it exists, leave it alone and say so; if it lacks the rules in the template (for example a `CLAUDE.md` with no changelog rule), propose the addition and let the user decide.

Fill the commands section of `CLAUDE.md` from the real `package.json` scripts, not from memory. `{{agents_import}}` becomes the line `@AGENTS.md` if the scaffold created an `AGENTS.md`, and is removed otherwise.

`{{cloud_tokens}}` is one of two sentences. With a vault: "`VERCEL_TOKEN` comes from the environment's variables; every other key comes from the key vault: run the command as `scripts/coffre run -- <command>`. Never print a key or write one into a file." Without: "Tokens come from the environment's variables (`VERCEL_TOKEN`, `NEON_API_KEY`...). Never write one into a file."

`CLAUDE.md` is written with the first documents and completed at the end: its Analytics, Email and Cloud sessions sections are filled once those steps have run. Remove the section of anything the user did not choose.

## 6. Verify and report

Setup is done when these are all true - check each one, do not assume:

- `git status` is clean and `git log origin/main` shows the first commit;
- the latest deployment is `Ready` in `vercel ls`;
- if there is a database, the app's environment has its variables (`vercel env ls`) and `.env.local` exists locally and is gitignored;
- the documents exist (or the ones skipped are named);
- if analytics was chosen: the build passes, ANALYTICS.md and the typed events list match, and an event was seen arriving (or you say you could not confirm it);
- if email was chosen: the test email was sent and the user confirmed receiving it, and the state of the sending domain is stated;
- if cloud sessions were chosen: `bash scripts/cloud-session.sh --check` runs locally without error, and the hook is committed. This does not prove the cloud works - only a first cloud session does. Say so, and give the user the one command to send there.

Then report in a few lines: repo URL, deployment URL, database project, analytics project, email provider and domain status, the documents written, and anything skipped or left for the user. If brand depth was "full", offer to run `brand-kit` now.

Finally rerun the preflight script once: its project section is the proof of what is in place. Bring the panel to its final state (every step `done`, `skipped` or `failed`), and tell the user if it stays open for the to-dos that remain.
