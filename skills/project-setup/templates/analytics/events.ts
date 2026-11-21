// Typed mirror of ANALYTICS.md. An event that is not declared here cannot be tracked.
// Update this file and ANALYTICS.md together, in the same change as the feature.

// --- Objects: properties sent on every event of the object -------------------

type Account = {
  signup_method: "email" | "google";
};

// --- Events: "Object Action" -> object properties & event-specific properties --

export type AnalyticsEvents = {
  "Account Created": Account;
  "Account Signed In": Account;
  "Account Signed Out": Account;
};

// --- User properties, set by identify() --------------------------------------

export type UserTraits = {
  email?: string;
  name?: string;
  created_at?: string;
};

export type EventName = keyof AnalyticsEvents;
