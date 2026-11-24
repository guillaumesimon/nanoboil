# Companion panel

A local page that stays open beside the chat during setup. It shows three things: the API keys this project needs and whether each one is where it belongs (the project's own Vercel variables, or the user's vault), what is left for the user to do, and the progress of the steps. It is also where the user adds a missing key, so that the key never passes through the chat.

The chat stays the place for questions and decisions. The panel never asks anything; it shows state and takes keys.

## Start it

Right after preflight, before the interview:

```bash
panel() { node <skill-dir>/scripts/panel.mjs "$@"; }
S="$HOME/.claude/project-setup/<project-name>.json"

panel init "$S" --name "<project-name>" --dir "$PWD" --lang fr      # fr or en: the language the user writes in
```

Start the server in the background (it prints one line, `panel: http://127.0.0.1:<port>/?t=<token>`) and keep it running for the whole setup:

```bash
node <skill-dir>/scripts/panel.mjs serve "$S"
```

`--dir` is the project directory: it is how the panel finds the project's Vercel link, and without it project keys cannot be stored.

Open that URL for the user: in the desktop app's browser pane if you have a tool for it, otherwise `open "<url>"`. Tell the user in one line that the page is there and what it is for. The token in the URL is what lets the page talk to the server; do not shorten the URL.

If `node` is missing or the server does not start, carry on without the panel and say so. Nothing in the setup depends on it.

## Keep it current

Define shell functions, not a variable holding the command: zsh does not split variables into words.

- **Steps** - declare them all as `pending` once the interview is over (only the ones that will run), then update each as you go. Labels and details are in the user's language.

  ```bash
  panel step "$S" github pending --label "Repo GitHub"
  panel step "$S" github running
  panel step "$S" github done --detail "privé, branche main" --url "https://github.com/<owner>/<name>"
  ```

  Statuses: `pending`, `running`, `done`, `skipped`, `failed`. On `failed`, put the reason in `--detail`.

  A step that needs a key declares it with `--needs PLUNK_SECRET_KEY` (several: comma-separated). The page then works out by itself, from where that key is stored, whether the step is waiting for it or it has arrived - so never write "waiting for the key" in `--detail`: that text is yours to update and goes stale the moment the user adds the key. `--detail` is for facts that stay true.

  When the user says they added a key, run `panel show`, and resume the step at once: set it `running`, do the work, set it `done`. The user watches the page, and a step that still reads "to do" after they did their part looks broken.

- **Keys** - declare every secret key the project needs, as soon as the interview tells you which, each with its scope (see "Two kinds of keys" below):

  ```bash
  panel key "$S" PLUNK_SECRET_KEY --scope project --note "Réglages du projet > API keys : la clé secrète (sk_...)"
  ```

  The script knows the scope of the usual ones and where they are created (project: Resend, Plunk; account: Neon, Supabase, fal.ai, ElevenLabs). For any other, pass `--scope`, `--label`, `--url` (the page where the key is created) and `--note`. An unknown key with no `--scope` is treated as a project key. Use the exact name the code will read. Public client-side keys (PostHog, Amplitude) are not secrets: you set them yourself in the project's Vercel variables, and they are not declared here.

- **To-dos** - what only the user can do. The user ticks them in the page.

  ```bash
  panel todo "$S" domain open --label "Vérifier le domaine d'envoi" --detail "Enregistrements DNS donnés par Plunk" --url "https://..."
  panel todo "$S" cloud-domains open --label "Coller les domaines autorisés" --copy <skill-dir>/assets/cloud/allowed-domains.txt
  ```

  `--copy <file>` adds a button that copies the file's content. Never point it at a file that holds a secret.

## Read it back

```bash
panel show "$S"
```

It prints each step, each key with its scope and whether it is where it belongs (`in the project's Vercel variables`, `in vault` or `MISSING`), and each to-do as `open` or `done`. Run it when the user says they have added a key or finished something, and before any step that needs a key. Do not poll it in a loop: ask the user to tell you, or check once when you reach the step.

## Two kinds of keys

Where a key is stored depends on whose it is. Getting this wrong mixes one project's credentials into every other project, so decide it for each key before declaring it.

| | Project key | Account key |
|---|---|---|
| What it is | issued for this one product: the provider has one key per project, app or sending domain | the user's own access to a service, the same for everything they build |
| Examples | Plunk secret key, Resend key, Stripe keys, a webhook secret, the PostHog or Amplitude project key | Neon API key, Supabase access token, fal.ai, ElevenLabs, Anthropic |
| Where it lives | **this project's Vercel environment variables**, for production, preview and development | the user's vault when they have one (`references/vault.md`: a Vercel project of its own; `vault ls` lists names, `vault run -- <command>` runs a command with every key in its environment). Without a vault: the CLI's own login, or a variable in the user's shell |
| Who reads it | the deployed app, and local or cloud sessions through `vercel env pull .env.local` | you, to run CLIs and scripts during development |

When in doubt, it is a project key: if the app reads it at runtime, it belongs to the project. A key in the vault under a project key's name (an old `PLUNK_SECRET_KEY`, say) belongs to some other project: never use it for this one and never copy it here. Tell the user it is there and ask for this project's own key.

The panel stores each key according to its scope: a project key goes to `vercel env add` in the project directory, for the three environments; an account key goes to `vault set`. Either way the value travels on standard input, is not written to the state file, not logged, and not returned by the page.

- A project key can only be stored once the Vercel project exists. Until then the panel shows it as missing and says it can be added as soon as the project is linked. This is why the Vercel step comes before analytics and email.
- Once `panel show` reports a project key present, run `vercel env pull .env.local --yes` so local development has it too.
- An account key that is already in the vault needs nothing from the user. Say so in the recap instead of asking for it.
- A key that is missing: tell the user it is waiting for them in the panel, continue with every step that does not need it, and come back to it.
- You never type a key into the panel yourself, and you never ask for one in chat. If the user pastes a key in chat anyway, tell them it is now in the conversation history and that they should rotate it, then use the panel.

If the user has no vault, do not declare account keys in the panel: its form for them needs the vault and fails with a message. The CLIs' own logins (`neon auth`, `supabase login`) cover the setup, and preflight has already checked them. Project keys work either way. Fall back to the manual commands in `email.md` if the panel itself cannot run.

## Stop it

The server stops by itself after three hours without a visit. At the end of setup, leave it running if to-dos are still open (the user will come back to tick them), and say so. Otherwise stop the background process.
