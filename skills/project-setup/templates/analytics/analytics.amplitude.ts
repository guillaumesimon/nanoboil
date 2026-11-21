// The only file that talks to the analytics SDK. Everything else calls track / identify / reset.
// Browser-side. See ANALYTICS.md for the tracking plan.
import * as amplitude from "@amplitude/analytics-browser";
import type { AnalyticsEvents, EventName, UserTraits } from "./events";

const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const serverZone = (process.env.NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE ?? "EU") as "EU" | "US";
const appEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";

let started = false;

/** Call once on the client, as early as possible. Without a key it stays silent (local dev, tests). */
export function initAnalytics() {
  if (started || !key || typeof window === "undefined") return;
  amplitude.init(key, { serverZone, autocapture: { pageViews: true, sessions: true } });
  started = true;
}

export function track<E extends EventName>(event: E, properties: AnalyticsEvents[E]) {
  if (!started) return;
  amplitude.track(event, { ...properties, app_env: appEnv });
}

/** userId is the stable database id of the user, never the email. */
export function identify(userId: string, traits: UserTraits = {}) {
  if (!started) return;
  amplitude.setUserId(userId);
  const user = new amplitude.Identify();
  for (const [name, value] of Object.entries(traits)) {
    if (value !== undefined) user.set(name, value);
  }
  amplitude.identify(user);
}

/** Call on sign-out so the next visitor is not merged into this user. */
export function reset() {
  if (!started) return;
  amplitude.reset();
}
