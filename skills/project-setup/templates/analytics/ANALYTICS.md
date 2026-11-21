# Analytics - {{project_name}}

Platform: **{{analytics_provider}}** ({{analytics_region}}). All tracking goes through `{{analytics_module_path}}`; nothing else in the code calls the SDK directly.

This file is the tracking plan. It lists every object, action, event and property the product sends. `{{analytics_events_path}}` is its typed mirror: the code cannot send an event that is not declared there. The two are updated together, in the same change as the feature.

## The framework: one object, one action

Every event is an **object** (a thing in the product) and an **action** (what happened to it), written `Object Action` in Title Case with the action in the past tense: `Account Created`, `Project Shared`.

- The **object** carries the context. Its properties are the same on every event of that object.
- The **action** comes from a short shared vocabulary. The same verb means the same thing on every object.
- Anything else that varies is a **property**, never a new event. `Project Created` with `source: "template"`, not `Template Project Created`.

## Before adding anything

In this order. Stop at the first one that fits.

1. **An existing event with an existing property value.** Most new features are a new value of a property that is already there.
2. **An existing event with a new property.** Add the property to the object if it describes the object, to the event if it only makes sense for that action.
3. **An existing object with an existing action** that has not been combined yet.
4. **A new action**, only if no verb in the vocabulary fits. Never add a synonym (`Removed` when `Deleted` exists).
5. **A new object**, only for a thing users would name themselves. A screen, a button or a step of a flow is not an object.

If a change makes an event, a property or an object unused, remove it here and in the code. A plan that only grows stops being read.

## Actions

| Action | Meaning |
|---|---|
| Created | The object now exists and did not before |
| Viewed | The user saw the object (a page or a detail, not a list item scrolling by) |
| Updated | An existing object was changed |
| Deleted | The object no longer exists |
| Started | A multi-step flow began |
| Completed | That flow reached its end successfully |
| Failed | That flow, or an operation the user asked for, ended in an error |

## Objects

One section per object. Properties listed here are sent on **every** event of the object.

### Account

The user's account. One per person.

| Property | Type | Values / example | Meaning |
|---|---|---|---|
| `signup_method` | string | `email`, `google` | How the account was created or accessed |

{{objects}}

## Events

| Event | When it fires | Properties beyond the object's |
|---|---|---|
| `Account Created` | The account is created, once, server-confirmed | - |
| `Account Signed In` | A sign-in succeeds | - |
| `Account Signed Out` | The user signs out | - |

{{events}}

`Signed In` and `Signed Out` are the two actions specific to Account; they are not in the shared vocabulary on purpose.

## Properties on every event

Sent automatically by the wrapper. Never pass them by hand.

| Property | Type | Meaning |
|---|---|---|
| `app_env` | string | `production`, `preview` or `development` |

## Users and identity

- **Anonymous first.** Before sign-in, the SDK gives the visitor an anonymous id. Events are tracked from the first page.
- **`identify(userId, traits)` is called once the user is known**: right after sign-up, after each sign-in, and on app load when a session already exists. `userId` is the database id of the user - stable, never the email. This links the anonymous history to the user.
- **`reset()` is called on sign-out**, so the next person on the same browser is not merged into the previous user.

### User properties

Set by `identify`. They describe the person, not an event.

| Property | Type | Example | Meaning |
|---|---|---|---|
| `email` | string | | Sign-in email |
| `name` | string | | Display name |
| `created_at` | ISO date | `2026-01-31T10:00:00Z` | When the account was created |

{{user_properties}}

## Naming rules

- Events: `Object Action`, Title Case, singular object, past-tense action.
- Properties: `snake_case`, the same name for the same thing everywhere (`project_id` is never `projectId` or `id` elsewhere).
- Booleans start with `is_` or `has_`. Ids end with `_id`. Counts end with `_count`. Dates are ISO 8601 strings.
- A property with free text that users type is not tracked. No passwords, tokens, message bodies or payment details, ever.

---

Last reviewed: {{date}}.
