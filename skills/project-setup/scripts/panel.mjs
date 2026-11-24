#!/usr/bin/env node
// Companion panel for project-setup: a local page that shows the setup's progress,
// the API keys the project needs, and what is left for the user to do.
//
//   panel.mjs init  <state.json> --name <project> --dir <project directory> [--lang fr|en]
//   panel.mjs step  <state.json> <id> <pending|running|done|skipped|failed> [--label L] [--detail D] [--url U] [--needs KEY[,KEY]]
//   panel.mjs key   <state.json> <NAME> [--scope project|account] [--label L] [--url U] [--note N]
//   panel.mjs todo  <state.json> <id> <open|done> [--label L] [--detail D] [--url U] [--copy <file>]
//   panel.mjs show  <state.json>                                             text summary, for the agent
//   panel.mjs serve <state.json> [--port N] [--ttl <minutes>]                prints the URL to open
//
// A key has a scope, and the scope decides where it is stored:
//   project  a key that belongs to this one project (Plunk, Resend, Stripe...): it goes to the
//            project's own Vercel environment variables (`vercel env add`, three environments).
//   account  a key of the user's own account, reused by every project (Neon, fal.ai...): it goes
//            to the user's key vault (`vault set NAME`, see references/vault.md).
// Values travel on stdin. They are never written to the state file, never logged, never
// returned by the API.
// No dependencies.

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const VAULT = process.env.PROJECT_SETUP_VAULT || path.join(os.homedir(), ".claude/bin/vault");
const VERCEL = process.env.PANEL_VERCEL || "vercel";
const KEY_NAME = /^[A-Z][A-Z0-9_]{1,63}$/;
const ENVIRONMENTS = ["production", "preview", "development"];

// Where each known key is created. Anything else is described by the caller.
const KNOWN_KEYS = {
  RESEND_API_KEY: { scope: "project", label: "Resend", url: "https://resend.com/api-keys", note: "One key per project" },
  PLUNK_SECRET_KEY: { scope: "project", label: "Plunk", url: "https://www.useplunk.com", note: "Project settings > API keys: the secret key (sk_...)" },
  NEON_API_KEY: { scope: "account", label: "Neon", url: "https://console.neon.tech/app/settings/api-keys" },
  SUPABASE_ACCESS_TOKEN: { scope: "account", label: "Supabase", url: "https://supabase.com/dashboard/account/tokens" },
  FAL_KEY: { scope: "account", label: "fal.ai", url: "https://fal.ai/dashboard/keys" },
  ELEVENLABS_API_KEY: { scope: "account", label: "ElevenLabs", url: "https://elevenlabs.io/app/settings/api-keys" },
};

// --- arguments ----------------------------------------------------------------

const [cmd, statePath, ...rest] = process.argv.slice(2);
const positional = [];
const opt = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) opt[rest[i].slice(2)] = rest[++i] ?? "";
  else positional.push(rest[i]);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}
if (!cmd || !statePath) fail("usage: panel.mjs <init|step|key|todo|show|serve> <state.json> ...  (see the header of this file)");

// --- state ----------------------------------------------------------------------

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { name: path.basename(statePath, ".json"), lang: "en", steps: [], keys: [], todos: [] };
  }
}

function writeState(state) {
  state.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath); // atomic: the server never reads a half-written file
}

function upsert(list, id, fields) {
  let item = list.find((x) => x.id === id);
  if (!item) list.push((item = { id }));
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) item[k] = v;
  return item;
}

// --- vault ------------------------------------------------------------------------

function exec(bin, args, input, cwd) {
  return new Promise((resolve) => {
    // The vault's own ids must not leak into a `vercel` call meant for the project.
    const env = { ...process.env };
    delete env.VERCEL_ORG_ID;
    delete env.VERCEL_PROJECT_ID;
    const child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"], cwd, env });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => child.kill(), 60_000);
    child.on("error", () => resolve({ code: 127, out: "" }));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input ?? "");
  });
}

function run(args, input) {
  if (!fs.existsSync(VAULT)) return Promise.resolve({ code: 127, out: "" });
  return exec(VAULT, args, input);
}

// Names only. The listings never contain a readable secret.
function parseNames(out) {
  const names = new Set();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]+)\s+\S/);
    if (m) names.add(m[1]);
  }
  return [...names];
}

async function vaultNames() {
  const { code, out } = await run(["ls"]);
  return code === 0 ? parseNames(out) : null;
}

// --- the project's own Vercel variables ------------------------------------------------

// The directory is linked once `vercel link` has written .vercel/project.json.
function linkedDir(state) {
  return state.dir && fs.existsSync(path.join(state.dir, ".vercel/project.json")) ? state.dir : null;
}

// null: no linked Vercel project yet, or it cannot be listed.
async function projectNames(state) {
  const dir = linkedDir(state);
  if (!dir) return null;
  const { code, out } = await exec(VERCEL, ["env", "ls"], "", dir);
  return code === 0 ? parseNames(out) : null;
}

// A project key is set for the three environments: `development` is the one `vercel env pull`
// returns, so local development and cloud sessions need it too.
async function setProjectKey(state, name, value) {
  const dir = linkedDir(state);
  if (!dir) return "project-unlinked";
  for (const environment of ENVIRONMENTS) {
    const { code } = await exec(VERCEL, ["env", "add", name, environment, "--force"], value, dir); // output discarded on purpose
    if (code !== 0) return "project-failed";
  }
  return null;
}

function scopeOf(state, name) {
  return state.keys.find((k) => k.id === name)?.scope || KNOWN_KEYS[name]?.scope || "account";
}

// present | missing | unlinked (project key, no Vercel project yet) | unknown (store unreachable)
function keyState(state, name, vault, project) {
  if (scopeOf(state, name) === "project") {
    if (!linkedDir(state)) return "unlinked";
    return project === null ? "unknown" : project.includes(name) ? "present" : "missing";
  }
  return vault === null ? "unknown" : vault.includes(name) ? "present" : "missing";
}

// --- commands -----------------------------------------------------------------------

const commands = {
  init() {
    const state = readState();
    state.name = opt.name || state.name;
    if (opt.dir) state.dir = path.resolve(opt.dir);
    state.lang = opt.lang || state.lang || "en";
    writeState(state);
    console.log(`state: ${statePath}`);
  },

  step() {
    const [id, status] = positional;
    if (!id || !["pending", "running", "done", "skipped", "failed"].includes(status)) fail("usage: step <state> <id> <pending|running|done|skipped|failed>");
    const state = readState();
    const needs = opt.needs === undefined ? undefined : opt.needs.split(",").map((n) => n.trim()).filter(Boolean);
    upsert(state.steps, id, { status, label: opt.label, detail: opt.detail, url: opt.url, needs });
    writeState(state);
  },

  key() {
    const [name] = positional;
    if (!KEY_NAME.test(name || "")) fail("usage: key <state> <NAME>   (NAME in capitals, as the code reads it)");
    const known = KNOWN_KEYS[name] || {};
    const state = readState();
    const existing = state.keys.find((k) => k.id === name);
    // An unknown key is a project key unless stated otherwise: the vault is for the user's own accounts only.
    const scope = opt.scope ?? existing?.scope ?? known.scope ?? "project";
    if (!["project", "account"].includes(scope)) fail("--scope is project or account");
    upsert(state.keys, name, { scope, label: opt.label ?? known.label ?? name, url: opt.url ?? known.url, note: opt.note ?? known.note });
    writeState(state);
  },

  todo() {
    const [id, status] = positional;
    if (!id || !["open", "done"].includes(status)) fail("usage: todo <state> <id> <open|done>");
    const state = readState();
    const copy = opt.copy ? fs.readFileSync(opt.copy, "utf8") : undefined; // text for a copy button, never a secret
    upsert(state.todos, id, { done: status === "done", label: opt.label, detail: opt.detail, url: opt.url, copy });
    writeState(state);
  },

  async show() {
    const state = readState();
    const [vault, project] = await Promise.all([vaultNames(), projectNames(state)]);
    const words = {
      project: { present: "in the project's Vercel variables", missing: "MISSING", unlinked: "MISSING (no Vercel project yet: the user can add it once the project is linked)", unknown: "project variables unreachable" },
      account: { present: "in vault", missing: "MISSING", unknown: "vault unreachable" },
    };
    console.log(`project: ${state.name}${state.dir ? "" : "  (no --dir given at init: project keys cannot be stored)"}`);
    for (const s of state.steps) {
      const missing = (s.needs || []).filter((n) => keyState(state, n, vault, project) !== "present");
      const ready = s.needs?.length && !missing.length && s.status === "pending" ? " (its keys have arrived: resume it)" : "";
      console.log(`step ${s.id}: ${s.status}${missing.length ? ` (waiting for ${missing.join(", ")})` : ready}`);
    }
    for (const k of state.keys) {
      const scope = scopeOf(state, k.id);
      console.log(`key ${k.id} [${scope}]: ${words[scope][keyState(state, k.id, vault, project)]}`);
    }
    for (const t of state.todos) console.log(`todo ${t.id}: ${t.done ? "done (ticked by the user or by you)" : "open"}`);
  },

  serve() {
    const token = crypto.randomBytes(18).toString("hex");
    const ttl = Number(opt.ttl || 180) * 60_000;
    let names = { vault: null, project: null };
    let namesAt = 0;
    let lastHit = Date.now();

    async function refreshNames(force) {
      if (force || Date.now() - namesAt > 30_000) {
        const [vault, project] = await Promise.all([vaultNames(), projectNames(readState())]);
        names = { vault, project };
        namesAt = Date.now();
      }
      return names;
    }

    function send(res, status, body, type = "application/json") {
      res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store", "x-content-type-options": "nosniff" });
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    }

    function readBody(req) {
      return new Promise((resolve) => {
        let raw = "";
        req.on("data", (d) => {
          raw += d;
          if (raw.length > 20_000) req.destroy();
        });
        req.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(null);
          }
        });
        req.on("error", () => resolve(null));
      });
    }

    const server = http.createServer(async (req, res) => {
      const port = server.address().port;
      const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      const url = new URL(req.url, `http://${hosts[0]}`);
      // A page on another site must not be able to talk to this server: the Host check stops
      // DNS rebinding, the Origin and token checks stop cross-site requests.
      if (!hosts.includes(req.headers.host)) return send(res, 403, { error: "host" });
      const origin = req.headers.origin;
      if (origin && !hosts.some((h) => origin === `http://${h}`)) return send(res, 403, { error: "origin" });
      const given = req.headers["x-panel-token"] || url.searchParams.get("t") || "";
      const ok = given.length === token.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
      if (!ok) return send(res, 403, { error: "token" });
      lastHit = Date.now();

      if (req.method === "GET" && url.pathname === "/") {
        return send(res, 200, fs.readFileSync(path.join(here, "panel.html"), "utf8"), "text/html");
      }

      if (req.method === "GET" && url.pathname === "/api/state") {
        const state = readState();
        const { vault, project } = await refreshNames(url.searchParams.has("refresh"));
        const wanted = new Set([...state.keys.map((k) => k.id), ...state.steps.flatMap((s) => s.needs || [])]);
        const keyStates = {};
        for (const name of wanted) keyStates[name] = keyState(state, name, vault, project);
        const keys = state.keys.map((k) => ({ ...k, scope: scopeOf(state, k.id) }));
        return send(res, 200, { ...state, dir: undefined, keys, keyStates, vaultUp: vault !== null, linked: Boolean(linkedDir(state)) });
      }

      if (req.method === "POST" && url.pathname === "/api/key") {
        const body = await readBody(req);
        const name = String(body?.name || "").trim();
        const value = String(body?.value || "").trim();
        if (!KEY_NAME.test(name)) return send(res, 400, { error: "name" });
        if (!value || value.length > 10_000) return send(res, 400, { error: "value" });
        const state = readState();
        // A declared key keeps its declared scope; only an undeclared one takes the page's choice.
        const declared = state.keys.find((k) => k.id === name);
        const scope = declared ? scopeOf(state, name) : body?.scope === "account" ? "account" : "project";
        if (scope === "project") {
          const error = await setProjectKey(state, name, value);
          if (error) return send(res, error === "project-unlinked" ? 409 : 502, { error });
          if (!declared) {
            upsert(state.keys, name, { scope, label: name });
            writeState(state);
          }
        } else {
          const { code } = await run(["set", name], value); // output discarded on purpose
          if (code !== 0) return send(res, 502, { error: code === 127 ? "vault-missing" : "vault-failed" });
        }
        await refreshNames(true);
        return send(res, 200, { ok: true, name, scope });
      }

      if (req.method === "POST" && url.pathname === "/api/todo") {
        const body = await readBody(req);
        const state = readState();
        const todo = state.todos.find((t) => t.id === body?.id);
        if (!todo) return send(res, 404, { error: "todo" });
        todo.done = Boolean(body.done);
        writeState(state);
        return send(res, 200, { ok: true });
      }

      send(res, 404, { error: "not found" });
    });

    server.listen(Number(opt.port || 0), "127.0.0.1", () => {
      console.log(`panel: http://127.0.0.1:${server.address().port}/?t=${token}`);
    });
    // Stops by itself once nobody has looked at it for a while.
    setInterval(() => {
      if (Date.now() - lastHit > ttl) process.exit(0);
    }, 60_000).unref();
  },
};

if (!commands[cmd]) fail(`unknown command: ${cmd}`);
await commands[cmd]();
