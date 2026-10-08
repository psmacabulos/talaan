# Backend architecture (proposed)

This is the proposed design for Phase 2, written before any backend code exists — a reference to build against, not a record of what's already built (that's what `docs/BUILD-LOG.md` and the `docs/backend/step-NN-*.md` recipes are for, once each piece is actually implemented). It will likely be revised once real code and the "Open questions" below have answers; treat it as the current best plan, not a frozen spec.

**Why this document exists:** as of 2026-10-03, one Next.js app became the backend for four different clients instead of one. That's a big enough shift that the database shape, the API shape and the auth shape all needed working through together, in one place, before any of Phase 2's remaining steps get a recipe. See `CLAUDE.md`'s "Backend architecture" section for the short version and the principles; this document is the long version.

## The one idea to hold on to

**Everything talks to one Next.js app, and that app has exactly one copy of the real logic.** Four very different clients (a browser, an Android kiosk, a guardhouse display, eventually a phone app) all hit the same API, and the API's route handlers are deliberately thin — they check who's calling, validate the request, call into a service function, and return its result as JSON. The service function is where the actual rules live (normalize this serial, find this student, is this a duplicate, write the tap and the outbox row together). A route handler and a Server Action calling the exact same service function is what makes "the web app already does this" and "the gate device needs to do this too" the same amount of work the second time, not a rewrite.

## The four clients

```mermaid
flowchart TB
    subgraph clients["Clients"]
        Admin["Admin web<br/>super admin, principals, teachers<br/>(the existing front end)"]
        Gate["Gate station — /gate<br/>Android tablet, USB NFC reader<br/>(keyboard-wedge input), kiosk browser"]
        Monitor["Guardhouse monitor — /gate/display<br/>live read-only feed"]
        ParentApp["Parent app (Phase 3)<br/>Expo (React Native), iOS + Android"]
    end

    subgraph app["The one Next.js app"]
        Routes["Route handlers<br/>src/app/api/v1/**<br/>thin: auth check → validate → call a service"]
        Actions["Server Actions<br/>src/features/**/actions.ts<br/>admin web's own writes"]
        Services["Service layer<br/>src/services/**<br/>the real logic, framework-agnostic"]
        Repos["Repositories<br/>src/data/**<br/>Prisma-backed in Phase 2"]
        Outbox[("Notification outbox<br/>one row per tap that should notify someone")]
        Worker["Outbox worker<br/>a separate long-running process"]
        SSE["SSE stream<br/>/api/v1/gate/stream"]
    end

    DB[("PostgreSQL<br/>one database, schoolId on every row")]
    Push["Web Push (VAPID)<br/>+ Firebase Cloud Messaging (Phase 3)"]

    Admin -->|cookie session| Actions
    Admin -->|cookie session| Routes
    Gate -->|device token| Routes
    Monitor -->|device token| SSE
    ParentApp -.->|Phase 3, bearer token| Routes

    Routes --> Services
    Actions --> Services
    Services --> Repos
    Services -->|same transaction as the tap| Outbox
    Repos --> DB
    Outbox --> DB
    Worker -->|reads pending rows| Outbox
    Worker --> Push
    Routes -->|a new tap| SSE

    style Services fill:#223060,color:#fff
    style Outbox fill:#1C77A5,color:#fff
    style Worker fill:#1C77A5,color:#fff
```

1. **Admin web** — the already-built front end. Super admin, principals and teachers. No change in how it talks to the app (Server Components, Server Actions) — it keeps using cookie sessions, not the versioned API.
2. **Gate station (`/gate`)** — an Android tablet with a USB NFC reader in keyboard mode, running a kiosk browser pointed at this page. The reader "types" the card's serial into whatever has focus; the page watches for a burst of keystrokes with no more than about 80ms between them, and treats a longer pause as "that scan is done." Signs in once with a long-lived device token, not a staff login — nobody re-types a password at a gate every morning.
3. **Guardhouse monitor (`/gate/display`)** — a second screen, usually just above or beside the gate, showing the last several taps as they happen: photo, name, grade. Read-only, no input. Uses the same device-token mechanism as the gate station — confirmed 2026-10-03.
4. **Parent app (Phase 3, not started)** — a separate Expo (React Native) app. Talks to the exact same `/api/v1` endpoints the web parent portal could also use, authenticated with the same kind of token. This replaces the earlier idea of wrapping the Next.js app itself in Capacitor (see `CLAUDE.md`'s "Plan history"). Small and parent-only by design: sign up or sign in, link a child, receive push notifications for that child's taps, and view the feed. It never gets staff, gate or admin screens.

## Database: tables and relationships

Most of this is `docs/DATA-MODEL.md`'s existing design, carried forward unchanged — Phase 1's types and Zod schemas were already written to match a real database, not just a mock. What's **new** here: `Device`, `PushToken`, and extending `Notification` to double as the outbox. What's **reworded**: `Staff` gains a real password hash; nothing in the shape changes.

```mermaid
erDiagram
    SCHOOL ||--o{ STUDENT : enrolls
    SCHOOL |o--o{ STAFF : employs
    SCHOOL ||--o{ CARD : issues
    SCHOOL ||--o{ TAP : "happens at"
    SCHOOL ||--o{ ALERT : "raised for"
    SCHOOL ||--o{ PARENT : "has accounts for"
    SCHOOL ||--o{ DEVICE : "owns"
    STUDENT ||--o{ CARD : "has, over time"
    STUDENT |o--o{ TAP : "recorded as, at tap time"
    DEVICE |o--o{ TAP : "received"
    TAP ||--o| ALERT : "may raise"
    TAP ||--o| NOTIFICATION : "may queue"
    PARENT ||--o{ PARENT_STUDENT_LINK : "linked via"
    STUDENT ||--o{ PARENT_STUDENT_LINK : "linked via"
    STUDENT ||--o{ NOTIFICATION : "receives"
    PARENT ||--o{ PUSH_TOKEN : registers

    STAFF {
        string id PK
        string schoolId FK "null ONLY for super_admin"
        Role role "super_admin, principal, teacher"
        string email
        string passwordHash "NEW — Auth.js, Step 30s mock had none"
        StaffStatus status "active, invited"
    }
    DEVICE {
        string id PK "NEW table"
        string schoolId FK
        string label "e.g. 'Main gate tablet', 'Guardhouse monitor'"
        DeviceKind kind "gate, monitor"
        string tokenHash "the long-lived token, hashed like a password"
        DeviceStatus status "active, revoked"
        datetime lastSeenAt "nullable — set by the heartbeat"
    }
    TAP {
        string id PK "made by the device, not the server"
        string schoolId FK
        string deviceId FK "nullable — null for a staff-session tap (Phase 1 style) or a simulated one"
        string cardSerial "normalized to the canonical format at write time"
        string studentId FK "who that serial belonged to at tap time, nullable"
        datetime clientTappedAt "the device's own clock"
        datetime serverReceivedAt "NEW — when the server actually saw it"
    }
    NOTIFICATION {
        string id PK
        string schoolId FK
        string studentId FK
        string tapId FK "NEW, nullable — a real join now exists; still nullable for old flat-copy-only rows"
        NotificationKind kind "time_in, time_out"
        datetime tappedAt "flat copy of the tap, kept for Phase 1 compatibility"
        boolean read
        NotificationStatus status "NEW — pending, sent, failed (this is the outbox)"
        int attempts "NEW — how many send attempts the worker has made"
        datetime sentAt "NEW — nullable"
    }
    PUSH_TOKEN {
        string id PK "NEW table"
        string parentId FK
        string platform "web, ios, android"
        string token "the actual VAPID subscription or FCM token"
        datetime lastUsedAt
    }
```

Everything not shown above (`School`, `Student`, `Card`, `Alert`, `ParentStudentLink`) is unchanged from `docs/DATA-MODEL.md` — see that document for their full fields and the reasoning behind them (why Card is its own record, why Tap stores its own `studentId` rather than looking one up live, and so on). That reasoning still holds; this document only covers what's different.

**`Notification` doubling as the outbox, instead of a separate table.** The pasted architecture spec describes "a row in a notification outbox" as its own thing from "a parent-visible notification." Phase 1 already has exactly one record per tap-that-should-notify-someone (`docs/NOTIFICATIONS.md`), and it already carries everything a feed needs. Adding `status`/`attempts`/`sentAt` to that same table, rather than introducing a second `NotificationOutbox` table that the worker drains into this one, means no join and no risk of the two ever disagreeing about what was actually sent. If delivery tracking grows more complex later (per-channel retries, per-parent-not-just-per-student state), split it out then — this is the simpler default, not a permanent constraint.

**Why `Tap.deviceId` is nullable.** A tap can come from three different places: the real `/gate` kiosk (has a `deviceId`), a staff session typing into the dashboard's "Simulate a tap" (no device, has a staff session instead), or — once Auth.js exists — a staff member standing in for a station that doesn't have its own token yet (`docs/PLAN.md`'s "early stations may instead identify themselves by a logged-in staff session"). The column has to tolerate all three without forcing a fake device row into existence for the latter two.

## API: endpoints under `/api/v1`

Only endpoints a **non-browser client** needs to call move to this versioned, token-authenticated API. Admin web's own writes stay as Server Actions (`src/features/*/actions.ts`) — nothing calls them over HTTP from outside this app, so there's no API contract to version or document separately. Auth.js keeps its own conventional route (typically `/api/auth/*`), outside the `/v1` prefix — that's a fixed convention of the library, not a route we're designing.

| Method & path | Who calls it | Auth | What it does |
|---|---|---|---|
| `POST /api/v1/devices/register` | Admin web (an admin action) | Staff cookie session | Creates a `Device` row for a new gate or monitor, returns the one-time plaintext token to show the admin (never retrievable again — only the hash is stored). |
| `POST /api/v1/gate/taps` | Gate station | Device token | Body: `{ clientTapId, cardSerial, clientTappedAt }`. Normalizes the serial, finds the student in that device's school, checks the debounce window, writes the `Tap` + outbox `Notification` in one transaction, publishes to the SSE stream. Returns the resolved outcome (valid / duplicate / lost card / unknown card) plus display info (name, grade, photo) for the kiosk's own confirmation screen. |
| `GET /api/v1/gate/stream` | Guardhouse monitor | Device token | Server-sent events: one event per new tap at that device's school, already resolved (so the monitor never has to re-derive anything). |
| `POST /api/v1/devices/heartbeat` | Gate station, monitor | Device token | Updates `Device.lastSeenAt`. Called on an interval even when nothing is being tapped, so "offline" means the device stopped checking in, not just stopped seeing cards. |
| `POST /api/v1/parents/signup` | Parent web portal, parent app | None (creates the account) | Same validation as today's mock signup; stores a real password hash. |
| `POST /api/v1/parents/login` | Parent web portal, parent app | Email + password | Issues the same token shape to both: an access token (short-lived) and a refresh token. The web portal keeps them in an httpOnly cookie; the Phase 3 app keeps them in secure device storage. Same endpoint, same response shape, different storage — not a different API. |
| `POST /api/v1/parents/refresh` | Parent web portal, parent app | Refresh token | Issues a new access token without asking for the password again. |
| `POST /api/v1/parents/link-child` | Parent web portal, parent app | Parent access token | Same LRN + last name + birth date check as today. |
| `GET /api/v1/parents/notifications` | Parent web portal, parent app | Parent access token | Same shape `getParentNotifications()` already returns today. |
| `POST /api/v1/parents/notifications/:id/read` | Parent web portal, parent app | Parent access token | Same as today's `markNotificationRead`. |
| `POST /api/v1/push-tokens` | Parent web portal (Web Push), parent app (FCM, Phase 3) | Parent access token | Registers or refreshes a `PushToken` for the signed-in parent. |

## Auth: three kinds of identity, not one

- **Staff** — Auth.js, a cookie session (JWT strategy, so no extra `Session` table). Browser-only; there's no staff-facing mobile client, so there's nothing to gain from also issuing staff a bearer token. This is already the Phase 2 roadmap's plan (`docs/PLAN.md`); nothing about the new architecture changes it.
- **Gate/monitor devices** — a long-lived opaque bearer token per device, created once by an admin through `POST /api/v1/devices/register` and typed into the kiosk's own setup screen (or baked into the kiosk browser's start URL). Stored **hashed** in `Device.tokenHash`, the same way a password would be — the plaintext is shown exactly once, at creation. Sent as `Authorization: Bearer <token>` on every `/api/v1/gate/*` and `/api/v1/devices/heartbeat` call. Long-lived on purpose: a physical kiosk is set up once by staff, not signed into every morning.
- **Parents** — a short-lived access token plus a longer-lived refresh token (both JWTs), issued by `/api/v1/parents/login` and `/signup`. The same pair, the same shape, works for both the web parent portal (held in an httpOnly cookie, same as any web session) and the Phase 3 Expo app (held in the device's secure storage) — one auth implementation serving both clients, which is the entire point of "token-based auth so web and mobile share it."

## Folder structure

```
src/
  app/
    (app)/              staff admin pages — unchanged
    gate/
      page.tsx           the kiosk tap screen (NEW)
      display/
        page.tsx          the guardhouse monitor, consuming the SSE stream (NEW)
    parent/               existing parent web portal — unchanged
    api/
      v1/                 NEW — every endpoint a non-browser client calls
        devices/
          register/route.ts
          heartbeat/route.ts
        gate/
          taps/route.ts
          stream/route.ts
        parents/
          signup/route.ts
          login/route.ts
          refresh/route.ts
          link-child/route.ts
          notifications/route.ts
        push-tokens/route.ts
  services/               NEW — the real logic, importable from a route handler or a Server Action alike
    taps/
      record-tap.ts        normalize serial → find student → dedupe → write Tap + outbox row, one transaction
    notifications/
      outbox.ts             the shared read/write helpers for the outbox columns on Notification
      dispatch.ts           what the worker actually calls per pending row (send, mark sent/failed)
    devices/
      auth.ts               verify a device token, look up its Device + school
    parents/
      auth.ts               verify credentials, issue/refresh tokens
  workers/                 NEW — the outbox worker's actual entry point: a small script, run as its own
                            long-running process (a second Heroku dyno, not a request handler)
  features/                existing — UI-facing schemas/types/components; admin Server Actions here call
                            into src/services/* instead of re-implementing logic a route handler also needs
  data/                    existing repository interfaces — Prisma-backed implementations arrive through
                            Phase 2's existing roadmap (Steps 31-34), unaffected by this document
```

**Why a route handler stays thin.** `src/app/api/v1/gate/taps/route.ts` should only ever: verify the device token, parse and validate the request body, call `services/taps/recordTap(...)`, and return its result as JSON. Every actual decision (what counts as a duplicate, how a serial gets normalized, whether to notify anyone) lives in `src/services/`, where it's a plain, testable function that doesn't know it's being called from an HTTP request at all — the same shape `docs/ATTENDANCE-MODEL.md`'s `resolveStationTap()` already proved out in Phase 1 for exactly this reason.

## Decisions made since this document was first written (2026-10-03)

- **Database and hosting: confirmed, no change.** PostgreSQL via Docker locally (Step 30) with Prisma, and Heroku (Basic dyno, funded by the GitHub Student credit) with Heroku Postgres in production. Heroku already runs as a long-lived process rather than serverless functions, which is exactly what the SSE monitor stream and the outbox worker both need.
- **Debounce window: confirmed at 1-2 minutes, not a few seconds.** Once a card is tapped, that same card can't register another tap for 1-2 minutes — specifically so a student lingering near the reader, or a card bumped twice by accident, can't double-count as two separate passes through the gate. The "few seconds" wording that first came up for this was a mistake, not a real alternative — minutes was the actual, already-documented intent all along.
- **Postgres version: 18, locally and in production (decided 2026-10-05).** Heroku Postgres supports 16 to 18, so the local Docker container uses `postgres:18`. When the Heroku Postgres add-on gets created, ask for version 18 too, so both run the same major version. Note: the Postgres 18 Docker image keeps its data in `/var/lib/postgresql/18/docker`, so the volume mounts at `/var/lib/postgresql`, not the older `/var/lib/postgresql/data` (see Step 30's recipe).
- **Guardhouse monitor auth: confirmed — a device token**, the same mechanism as the gate station (see "The four clients" above).
- **Tap direction: confirmed — keep guessing it from order, don't store it explicitly.** A tap, by itself, only says "this card was read at this time" — the reader has no idea whether the student was walking in or walking out, the same way a single turnstile just sees "someone passed." With one reader at one gate and no second reader, button or time-of-day rule to base an explicit direction on, the app keeps assuming the 1st tap of the day is "time in," the 2nd is "time out," the 3rd is "time in" again, and so on — worked out fresh from the tap list each time, never stored as a label. This is the same approach `docs/ATTENDANCE-MODEL.md` and `docs/PLAN.md` already had decided; this document's first draft re-raised it and the owner re-confirmed it.

## Open questions (still unresolved)

These need an answer before the recipes that depend on them can be written — later Phase 2 steps touching the tap API will name the specific question they're blocked on.

1. **What does your actual NFC reader output?** Deferred — the reader is in the Philippines and wasn't available to test when this question first came up. The tap flow depends on normalizing whatever string the reader "types" into the canonical `cardSerial` format already used everywhere else in this app (uppercase hex bytes joined by colons, e.g. `04:A3:5F:2B:91:C0:80`) — but that normalization step can't be written correctly without a real sample first: raw hex with no separators? Decimal? A fixed length? Plug the actual reader in, tap a real card into a plain text field, and paste exactly what shows up (including whether it ends with a newline/Enter keystroke, which the ~80ms-pause detection may need to know about too).

## Quick recipes

**I'm starting the recipe for a Phase 2 step that touches one of the open questions above.** Don't guess — ask first, or point back to this section. A recipe that bakes in a guess (e.g. assuming the reader's output format) is expensive to unwind once the owner has already typed and run it.

**I want to add a new `/api/v1` endpoint.** Put the real logic in a new or existing `src/services/**` function first, as a plain function that takes its dependencies as arguments (same pattern as Phase 1's `notifyParentsForTap(tap, deps)` in `docs/NOTIFICATIONS.md`) — then write the route handler as the thin wrapper described above. This keeps the function callable from a test, a Server Action, or another service without ever touching `next/server` types.

**I want to know if something is still true once Prisma models exist.** This document describes the *proposed* shape. Once Steps 31+ actually define `schema.prisma`, that file becomes the source of truth for the database shape — update this document's ER diagram to match it if they drift, the same way `docs/DATA-MODEL.md` stays in sync with the Zod schemas it describes.
