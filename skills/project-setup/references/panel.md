# Companion panel

A local page that stays open beside the chat during setup. It shows three things: the API keys this project needs and whether each is in the user's vault, what is left for the user to do, and the progress of the steps. It is also where the user adds a missing key, so that the key never passes through the chat.

The chat stays the place for questions and decisions. The panel never asks anything; it shows state and takes keys.

## Start it

Right after preflight, before the interview:

```bash
panel() { node <skill-dir>/scripts/panel.mjs "$@"; }
S="$HOME/.claude/project-setup/<project-name>.json"

panel init "$S" --name "<project-name>" --lang fr      # fr or en: the language the user writes in
```

Start the server in the background (it prints one line, `panel: http://127.0.0.1:<port>/?t=<token>`) and keep it running for the whole setup:

```bash
node <skill-dir>/scripts/panel.mjs serve "$S"
```

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

  A step that needs a key declares it with `--needs PLUNK_SECRET_KEY` (several: comma-separated). The page then works out by itself, from the vault, whether the step is waiting for that key or the key has arrived - so never write "waiting for the key" in `--detail`: that text is yours to update and goes stale the moment the user adds the key. `--detail` is for facts that stay true.

  When the user says they added a key, run `panel show`, and resume the step at once: set it `running`, do the work, set it `done`. The user watches the page, and a step that still reads "to do" after they did their part looks broken.

- **Keys** - declare every secret key the project needs, as soon as the interview tells you which:

  ```bash
  panel key "$S" PLUNK_SECRET_KEY --note "Réglages du projet > API keys : la clé secrète (sk_...)"
  ```

  The script knows where the usual ones are created (Resend, Plunk, Neon, Supabase, fal.ai, ElevenLabs). For any other, pass `--label`, `--url` (the page where the key is created) and `--note`. Use the exact name the code will read. Public client-side keys (PostHog, Amplitude) are not secrets and do not belong here.

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

It prints each step, each key as `in vault` or `MISSING`, and each to-do as `open` or `done`. Run it when the user says they have added a key or finished something, and before any step that needs a key. Do not poll it in a loop: ask the user to tell you, or check once when you reach the step.

## Keys and the vault

The user's vault is `~/.claude/bin/coffre` (a Vercel project that holds every API key; `coffre ls` lists names, `coffre run -- <command>` runs a command with all keys in its environment). The panel sends a typed key to `coffre set NAME` on standard input. The key is not written to the state file, not logged, and not returned by the page afterwards.

- A key that is already in the vault needs nothing from the user. Say so in the recap instead of asking for it.
- A key that is missing: tell the user it is waiting for them in the panel, continue with every step that does not need it, and come back to it.
- You never type a key into the panel yourself, and you never ask for one in chat. If the user pastes a key in chat anyway, tell them it is now in the conversation history and that they should rotate it, then use the panel.
- To get a key from the vault into the app's Vercel project, see "From the vault to the project" in `vercel.md`.

If the vault script does not exist on this machine, the panel says so and hides the key forms. Fall back to the manual commands in `email.md`.

## Stop it

The server stops by itself after three hours without a visit. At the end of setup, leave it running if to-dos are still open (the user will come back to tick them), and say so. Otherwise stop the background process.
