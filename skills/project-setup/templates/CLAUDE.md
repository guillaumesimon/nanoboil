# {{project_name}}

{{one_line_pitch}}

{{agents_import}}

## Before you build

- Read [PRODUCT_VISION.md](PRODUCT_VISION.md) before adding or changing a feature. If a request falls outside the v1 scope or contradicts a non-goal, say so before building it.
- Read [BRAND.md](BRAND.md) before writing any user-facing text or building any interface. Copy, colours, type and tone follow it.
- If a decision changes the vision or the brand, update the document in the same change. These files describe the project as it is, not as it was on day one.

## Changelog

Keep [CHANGELOG.md](CHANGELOG.md) up to date. Every time a feature is added, changed or removed, add a line under today's date, in the same change as the code:

- write what changed for the user, not which files were touched;
- one line per change, newest date at the top;
- fixes and refactors with no visible effect do not need an entry.

## Analytics

Tracking is part of every feature, not a follow-up. [ANALYTICS.md](ANALYTICS.md) is the tracking plan; `{{analytics_events_path}}` is its typed mirror.

When you add or change a feature:

1. **Read ANALYTICS.md first**, all of it. Know the existing objects, actions and properties before deciding anything.
2. **Reuse before you add**, in the order the file gives: an existing event with an existing property value, then a new property, then an existing object with an existing action, then a new action, and only last a new object. Never add a synonym of something that exists.
3. **Review while you are there.** If the change leaves an event or a property unused, or you find two that mean the same thing, remove or merge them in the same change and say so.
4. **Track through the wrapper only** (`{{analytics_module_path}}`): `track`, `identify`, `reset`. Never call the SDK directly.
5. **Update ANALYTICS.md and the typed events file together**, in the same change as the code. An event that is in one and not the other is a bug.

Identity: call `identify(user.id, traits)` after sign-up, after sign-in and on load with an existing session; call `reset()` on sign-out. The id is the database id, never the email. New user properties go in the "User properties" table.

Names: events are `Object Action` in Title Case (`Project Created`); properties are `snake_case`. Never track free text typed by users, credentials or payment details.

## Email

All email goes through `sendEmail` in `{{email_module_path}}` ({{email_provider}}); nothing else imports the provider. Copy follows BRAND.md. Preview and development only send to `EMAIL_DEV_RECIPIENT`, never to real users. Do not send an email to real users without being asked.

## Stack

{{stack_summary}}

- Hosting: Vercel (project `{{vercel_project}}`). Pushes to `main` deploy to production; other branches get a preview.
- Database: {{database_summary}}
- Analytics: {{analytics_provider}}
- Email: {{email_provider}}
- Repository: {{repo_url}}

## Commands

{{commands}}

## Cloud sessions

This project is set up for Claude Code in the cloud. At session start, `scripts/cloud-session.sh` links the Vercel project, pulls `.env.local` and prints which CLIs are working.

- If a CLI or API fails in the cloud, run `bash scripts/cloud-session.sh --check` first: it says whether the CLI, the token or the allowed domain is missing. Those three are fixed in the cloud environment's settings, by the user, not in the repo.
- {{cloud_tokens}}
- GitHub goes through a proxy: `git push` and `gh api` work; `gh pr` and `gh issue` return 403. Use `gh api` for pull requests and issues.
- The user's personal `~/.claude` (global rules, skills) is not available there. Anything a cloud session must know has to be in this file or in `.claude/`.

## Rules

- Never commit secrets. Environment variables live in Vercel (`vercel env`) and in `.env.local`, which is gitignored. After adding one on Vercel, run `vercel env pull .env.local`.
- Database schema changes go through versioned migrations, never ad hoc SQL on the remote database.
- Do not push, deploy to production, or run a destructive command without being asked.
