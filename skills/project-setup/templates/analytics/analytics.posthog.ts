// The only file that talks to the analytics SDK. Everything else calls track / identify / reset.
// Browser-side. See ANALYTICS.md for the tracking plan.
import posthog from "posthog-js";
import type { AnalyticsEvents, EventName, UserTraits } from "./events";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let started = false;

/** Call once on the client, as early as possible. Without a key it stays silent (local dev, tests). */
export function initAnalytics() {
  if (started || !key || typeof window === "undefined") return;
  posthog.init(key, { api_host: host, person_profiles: "identified_only" });
  posthog.register({ app_env: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development" });
  started = true;
}

export function track<E extends EventName>(event: E, properties: AnalyticsEvents[E]) {
  if (!started) return;
  posthog.capture(event, properties);
}

/** userId is the stable database id of the user, never the email. */
export function identify(userId: string, traits: UserTraits = {}) {
  if (!started) return;
  posthog.identify(userId, traits);
}

/** Call on sign-out so the next visitor is not merged into this user. */
export function reset() {
  if (!started) return;
  posthog.reset();
}
