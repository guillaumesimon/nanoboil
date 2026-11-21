# Analytics

PostHog or Amplitude, chosen in the interview. Skip if the user said none, or if preflight shows `ANALYTICS.md: exists` (then only check the CLAUDE.md rule is there).

What gets set up: a project on the platform, its key in Vercel, one wrapper module that is the only code allowed to call the SDK, a typed list of events, and `ANALYTICS.md` - the tracking plan that every later feature has to read and update.

The plan is the important part. Installing an SDK takes five minutes; what goes wrong over months is forty near-duplicate events nobody can query. The framework, the typed mirror and the CLAUDE.md rule exist to prevent that.

## 1. Project and key

The project key of both platforms is a **public, client-side key** (it ships in the browser bundle). It is not a secret and can be passed on the command line.

**PostHog** - if the PostHog connector is available in this session, use it to find or create the project and read its project API key (`phc_...`) and region. Otherwise ask the user to create the project at eu.posthog.com (or us.posthog.com) and paste the project key.

Check the plan's project limit **before the interview's recap**, not at this step: the free plan allows a single project per organization, so on a second product creation is refused. With the connector, `organization-get` gives the count of non-demo projects and the `organizations_projects` limit. If the limit is reached, ask the user to choose: reuse the existing project (every event then needs an `app_name` property added by the wrapper, to tell the products apart), create a new PostHog organization for this product, or set everything up without a key for now. Never send a new product's events into an existing project without asking.

**Amplitude** - if the Amplitude connector is available, use it to find the project and its API key. Otherwise ask the user to create the project in Amplitude and paste the API key. Ask which data region (EU or US); it cannot be changed later.

If a project with the same name already exists, ask before reusing it. Default to the EU region.

Add the variables to Vercel for `production`, `preview` and `development`, then `vercel env pull .env.local`:

| Platform | Variables |
|---|---|
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (`https://eu.i.posthog.com` or `https://us.i.posthog.com`) |
| Amplitude | `NEXT_PUBLIC_AMPLITUDE_API_KEY`, `NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE` (`EU` or `US`) |

Many teams send preview and development traffic to a separate project so tests do not pollute the numbers. For a small project one project is enough: every event carries `app_env`, filter on it.

## 2. Code

```bash
pnpm add posthog-js                      # PostHog
pnpm add @amplitude/analytics-browser    # Amplitude
```

Copy from `<skill-dir>/templates/analytics/`:

- `events.ts` -> `src/lib/analytics/events.ts`
- `analytics.posthog.ts` or `analytics.amplitude.ts` -> `src/lib/analytics/index.ts`

Adapt paths to the project (no `src/` directory, a non-Next.js stack: use that stack's public env variable prefix). The templates are written against the SDKs' long-stable calls, but check them against the installed package's types - `pnpm tsc --noEmit` must pass - and fix the wrapper, not the call sites, if an option has changed.

Then wire it:

- call `initAnalytics()` once on the client at app start. In Next.js App Router that is a small client component rendered in the root layout (or `instrumentation-client.ts` on versions that support it);
- if the project has authentication, call `identify(user.id, traits)` after sign-up, after sign-in and on load when a session exists, and `reset()` on sign-out. Track `Account Created`, `Account Signed In`, `Account Signed Out` at those points;
- if there is no authentication yet, leave `identify` and `reset` unused and say so in ANALYTICS.md: they are to be wired the day sign-in is added. Remove the `Account` events from the plan and from `events.ts` rather than document events that never fire.

## 3. ANALYTICS.md

Fill `<skill-dir>/templates/analytics/ANALYTICS.md` and write it at the project root.

- Derive the first objects from PRODUCT_VISION.md: the two to four things a user of this product would name (`Project`, `Invoice`, `Workout`...). Propose them to the user with their properties and the handful of events that matter for v1 - the ones that tell whether the product works - and let them correct before writing.
- Resist completeness. Five to ten events on day one. An event nobody will look at is a cost.
- `{{objects}}`, `{{events}}`, `{{user_properties}}` take extra rows in the same table format; remove the placeholder if there is nothing to add.
- Every object and event in ANALYTICS.md must exist in `events.ts`, and the reverse.

## 4. CLAUDE.md

The project CLAUDE.md template has an "Analytics" section. Keep it: it is what makes later sessions review the plan before adding events. If the project already has a CLAUDE.md without it, propose the addition.

## 5. Check

- `pnpm tsc --noEmit` and `pnpm build` pass.
- Run the app, load a page, and confirm an event arrives: in the browser's network tab a request goes to the platform's host, and (with the connector) the event shows up in the project within a minute or two. Say plainly if you could not confirm arrival.
- A call like `track("Not In Plan", {})` fails to type-check. Try it, then remove it.

## Cloud sessions

Add the platform's hosts to the cloud environment's allowed domains if cloud sessions need to query analytics: `*.posthog.com`, or `*.amplitude.com`. The app's own keys reach cloud sessions through `vercel env pull`, nothing to add to the environment variables.
