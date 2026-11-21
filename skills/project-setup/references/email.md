# Email

Resend or Plunk, chosen in the interview. Skip if the user said none.

Goal: from day one the product can write to its users - a welcome email, a notification, a "we fixed it" - through one function, `sendEmail`, with the provider hidden behind it.

Choosing between them, if the user asks: **Resend** is a sending API with very good deliverability tooling and React templates; campaigns exist but it is developer-first. **Plunk** combines transactional email with event-triggered automations and campaigns in one tool, and can be self-hosted. Transactional only: Resend. Wanting onboarding sequences triggered by product events without building them: Plunk.

Both providers change their APIs and SDKs; read the provider's current docs before writing the wrapper rather than relying on memory.

## 1. Account, key, domain

These three need the user. You do not create accounts or handle the key.

1. **API key** - `RESEND_API_KEY` or `PLUNK_SECRET_KEY` (for Plunk, the **secret** key, `sk_...`). It is a secret and never passes through the chat.

   - **With the vault** (preflight `vault: ok`): if the name is in `vault_keys`, there is nothing to ask. Otherwise declare the key in the panel (`references/panel.md`); the user creates it in the provider's dashboard and pastes it into the page. Once `panel show` reports it `in vault`, copy it to the project for the three environments with the command in `vercel.md`, "From the vault to the project".

     One key per provider account is reused by every project. If the user wants a separate key for this project (Plunk keys are per Plunk project), store it under a name of its own, for example `PLUNK_SECRET_KEY_<PROJECT>`, and copy it into the project as `PLUNK_SECRET_KEY`.

   - **Without the vault**: the user adds it to Vercel themselves:

     ```bash
     vercel env add RESEND_API_KEY production --sensitive
     ```

     Give them that command for `production` and `preview`, and the same without `--sensitive` for `development`.

   The `development` value matters: it is the only one `vercel env pull` returns, so without it local development and cloud sessions have no key. Then run `vercel env pull .env.local` yourself.

2. **Sending domain** - without a verified domain, email either cannot be sent to real users or lands in spam. Ask which domain to send from. If the user has none yet, set everything up and list domain verification as the one thing left to do. Resend can still send a test to the account owner's own address from its test sender. Plunk cannot: `from` must be on a verified domain, so with Plunk there is no test email until the domain is verified - say so in the recap instead of promising one.

3. **DNS** - the provider gives the records (SPF, DKIM, usually on a subdomain like `send.` or `mail.`). If the domain's DNS is on Vercel, add them with `vercel dns add` after showing the user the records; otherwise give the user the records to add at their registrar. Verification can take from minutes to a day; do not block the rest of the setup on it.

Also set `EMAIL_FROM` (for example `Name <hello@domain.com>`) in Vercel, non-sensitive.

## 2. Code

One module, server-side only: `src/lib/email/index.ts` exporting

```ts
sendEmail({ to, subject, html, text?, replyTo? }): Promise<{ id: string }>
```

- It reads the key and `EMAIL_FROM` from the environment, throws a clear error if the key is missing, and never runs in the browser (no `NEXT_PUBLIC_` variable, no import from a client component).
- Nothing else in the code imports the provider's SDK. Switching provider later means rewriting this one file.
- In `development` and `preview`, send only to an allowlist (`EMAIL_DEV_RECIPIENT`) so a test never emails a real user.
- Resend: use the official `resend` package.
- Plunk (checked against docs.useplunk.com in November 2026, recheck if a call fails): no SDK, plain `fetch`. `POST https://next-api.useplunk.com/v1/send` with `Authorization: Bearer <sk_...>` (a `pk_` key is refused with 401) and a JSON body `{ to, from, subject, body, reply? }` where `body` is the HTML. The email id is at `data.emails[0].email` in the response. To trigger automations, `POST /v1/track` with `{ email, event, data? }`.

Add one real template, the welcome email, written in the voice of BRAND.md. Plain and short: what the product is for, the one thing to do next, a real reply-to address.

If the project has authentication, send the welcome email when `Account Created` fires. If the provider supports event-triggered automations (Plunk), tell the user they can build sequences on the same event names as ANALYTICS.md, and keep those names identical.

## 3. Check

Send one test email to the user's own address and ask them to confirm it arrived and how it looks. Sending an email is an outward action: tell the user you are about to send it and to which address. Report the message id. If the domain is not verified yet, say so and what that limits.

## 4. CLAUDE.md

The project CLAUDE.md template has an "Email" section: all email goes through `sendEmail`, follows BRAND.md, and never goes to real users from preview or development.

## Cloud sessions

Add the provider's API host to the cloud environment's allowed domains (`api.resend.com` or the Plunk API host) if cloud sessions need to send test emails. The key reaches cloud sessions through `vercel env pull`.
