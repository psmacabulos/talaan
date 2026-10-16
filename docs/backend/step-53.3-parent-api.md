# Steps 53.3 and 53.4: The parent API

> **Split again on 2026-10-16** (owner approval), after three plan reviews with the systems-architect. This recipe was too big for one review, so it became four steps (`docs/PLAN.md`):
> - **53.1** (built): the sign-up, sign-in and link-a-child rules moved to `src/services/parents/` (section 2's first three rows), with a decoy password check and emails stored in lower case. Recipe: `docs/backend/step-53.1-parent-sign-in-services.md`. The services are named `registerParent`, `checkParentSignIn` and `linkChildToParent`, and every failure carries a `code` (`invalid_input`, `email_taken`, `too_many_tries`, `wrong_credentials`, `no_match`, `already_linked`), which the API maps to the error table below.
> - **53.2**: section 2's `childrenToday` and notifications rows, and decision 6 (paging). Changed by the review: the cursor is opaque (base64url of `<tappedAt>|<id>`), not a notification id, and the unread count stops at 10.
> - **53.3**: section 1 (the tables), `parent-token.ts`, the addresses down to `children/:id/taps`, and a per-address sign-in limit. Don't wrap `registerParent` and the new token in one transaction: a caught unique-email error aborts a Postgres transaction.
> - **53.4**: the notification and push-token addresses, section 4 (photos), section 5 (`docs/PARENT-API.md`) and the API browser tests.
>
> The original text follows, unchanged except for this note.


> **Split from Step 53 on 2026-10-15** (owner approval). Step 53 (`docs/backend/step-53-parent-accounts-across-schools.md`) comes first and moves a parent's school onto each linked child. This recipe builds on that, and is updated for the 2026-10-13 decisions (`docs/SCALING.md` section 2):
> 1. **One parent account covers any number of schools.** Sign-up asks for no school, linking a child asks for it (`POST /children` takes `schoolId`), and each child in an answer carries its own school.
> 2. **The app registers an Expo push token.** Step 54 sends through Expo's push service.
> 3. **Every parent query loads one day or one page at a time,** never the whole history, for the web portal and the API alike.
>
> The product's name on screens is Bantay Aral (Step 51.5). The code name, and the `tal_par_` token prefix, stay. The parent app's own repository works from `docs/PARENT-APP-BRIEF.md`, which summarises this contract. Keep the two in step.

> **Fast-track recipe.** Written before the code on 2026-10-11, for the owner to approve before it's built. It was added to the plan the same day: the Expo parent app starts on 2026-10-12, and it needs these addresses to call. When it's built, a "What changed while building" section (just before "Verify it worked") will list where the real code differs from this plan.

## Why

The parent app (Phase 3) is a separate Expo app on the parent's phone. It can't use the web portal's Server Actions or its cookie: those only work inside this web app. It needs plain web addresses under `/api/v1/parents/*` that answer in JSON, the same way the gate tablet does (Steps 43–46).

The web parent portal already does everything the app needs: sign up, sign in, link a child, see today's taps, and read notifications. So this step mostly **moves those rules out of the web actions into services**, then puts two thin doors in front of them: the web's Server Actions (unchanged for the user) and the new API.

```mermaid
flowchart LR
    App["Expo parent app<br/>Authorization: Bearer tal_par_…"] --> API["/api/v1/parents/*<br/>(thin route handlers)"]
    Web["/parent web portal<br/>signed cookie (Step 50.1)"] --> Actions["Server Actions<br/>(auth-actions.ts, …)"]
    API --> Services["src/services/parents/<br/>signUp · signIn · linkChild<br/>childrenToday · notifications"]
    Actions --> Services
    Services --> Repos[("repositories")]
```

## Decisions in this recipe (please confirm or change)

1. **One token per phone, stored hashed, revocable. Not a pair of JWTs.** `docs/ARCHITECTURE.md` proposed a short-lived access token plus a refresh token. That pair exists so a server can check a token without a database lookup. At our size, one indexed lookup per request costs nothing, and a stored token buys things a JWT can't:
   - signing out really ends the token;
   - a lost phone can be cut off;
   - there's no refresh logic to get wrong in the app.

   It's built exactly like the gate's device token (Step 43): a `tal_par_` prefix plus 32 random bytes, kept as a sha256 hash. The token lasts **90 days from its last use**, so a parent who opens the app weekly never signs in again. `ARCHITECTURE.md` is updated to match.
2. **The app stores the token in the phone's secure storage** (Expo's `expo-secure-store`). That's an app decision, noted in `docs/PARENT-API.md` for tomorrow.
3. **Push tokens are stored now and sent later.** `POST /api/v1/parents/push-tokens` saves the phone's **Expo push token** (`ExponentPushToken[…]`), so the app can register from its first version. Actually sending a push is Step 54. Until then the app shows the feed when opened (pull to refresh), the same as the web portal's bell.
4. **The read mark stays shared by the child's guardians**, as today (`docs/NOTIFICATIONS.md`). Two parents of one child see the same read state. Per-parent read marks can come with the outbox.
5. **Photos:** a parent's token can load **their own linked children's** photos from `/api/v1/photos/…`, and no one else's.
6. **Paging on the web too.** The bell shows the newest 30 and the unread count (counted in the database, not by loading everything). The notifications page shows 30, with a "Show older" link that keeps `?before=<id>` in the address. The home page loads only today's taps for each child, not their whole history.

## Steps

### 1. Database

`prisma/schema.prisma`:

```prisma
model ParentToken {
  id         String    @id @default(uuid())
  parentId   String
  parent     Parent    @relation(fields: [parentId], references: [id], onDelete: Cascade)
  // sha256 of the token. The token itself is returned once, at sign-in.
  tokenHash  String    @unique
  // What the app says it is, e.g. "Pixel 7", so a parent can tell sessions apart later.
  label      String?
  lastUsedAt DateTime  @default(now())
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([parentId])
}

enum PushPlatform {
  ios
  android
  web
}

model PushToken {
  id         String       @id @default(uuid())
  parentId   String
  parent     Parent       @relation(fields: [parentId], references: [id], onDelete: Cascade)
  // The phone's push address, as Expo or Firebase gave it.
  token      String       @unique
  platform   PushPlatform
  lastUsedAt DateTime     @default(now())
  createdAt  DateTime     @default(now())

  @@index([parentId])
}
```

```bash
npx prisma migrate dev --name parent_tokens
```

`onDelete: Cascade` here, unlike everywhere else (`Restrict`): a token means nothing without its parent, so deleting a parent account (the privacy step) takes its tokens with it.

### 2. Services (`src/services/parents/`)

The rules move here from `src/features/parents/auth-actions.ts`, `notification-actions.ts` and the dashboard page. Each takes its repositories as an argument, like `recordTap`:

| File | Function | What it does |
|---|---|---|
| `parent-token.ts` | `issueParentToken(parentId, label)` / `authenticateParent(header)` | Makes a token, or turns `Bearer …` into `{ parentId }`. It's null when missing, unknown, revoked or unused for 90 days, and updates `lastUsedAt` at most once an hour. |
| `sign-up.ts` | `signUpParent(input)` | Validates, checks the email is free, then hashes and creates. Returns the parent or field errors. |
| `sign-in.ts` | `signInParent(email, password)` | The throttle (Step 50.1), then `verifyPassword`. Returns the parent or one vague error. Like `checkStaffSignIn`, it runs scrypt against a decoy hash when the email is unknown, so an unknown email doesn't answer faster (left over from Step 50.1). |
| `link-child.ts` | `linkChild(parentId, details)` | The school, LRN, last name and birth date (Step 53). The link saves that school. Returns the student, "no match" or "already linked". |
| `children-today.ts` | `childrenToday(parentId, now)` | Each linked child with their school, and `studentStatus` and `dayTapSummary` for today, from only today's taps, on their own school's times. |
| `notifications.ts` | `listNotifications(parentId, { before, limit })`, `countUnread(parentId)`, `markRead(parentId, id)`, `markAllRead(parentId)` | The feed, newest first, 30 at a time across all the parent's linked children (one query, by their links), the unread count, and the read marks, with the ownership checks Step 53 leaves. |

The web Server Actions then call these and keep their current results, so the web portal works exactly as before. Its existing tests and `e2e/parent.spec.ts` prove that.

### 3. The addresses

Every route is thin: authenticate, validate with Zod, call a service, and answer. All bodies are JSON.

| Method and address | Sign-in | Body / query | Answer |
|---|---|---|---|
| `GET /api/v1/parents/schools` | none | | `{ schools: [{ id, name }] }`, for the school picker when linking a child |
| `POST /api/v1/parents/signup` | none | `{ firstName, lastName, mobile, email, password, deviceLabel? }` | `201 { token, parent }` |
| `POST /api/v1/parents/login` | none | `{ email, password, deviceLabel? }` | `200 { token, parent }` |
| `POST /api/v1/parents/logout` | token | | `204`; the token is revoked and its push token removed |
| `GET /api/v1/parents/me` | token | | `{ parent, children: [ChildToday] }` |
| `POST /api/v1/parents/children` | token | `{ schoolId, lrn, lastName, birthDate }` | `201 { child: ChildToday }` |
| `GET /api/v1/parents/children/:id/taps?date=YYYY-MM-DD` | token | | `{ date, status, flexible, taps: [{ at, kind }] }`; `404` for a child who isn't theirs |
| `GET /api/v1/parents/notifications?before=<id>&limit=30` | token | | `{ notifications: [Item], unreadCount, nextBefore }` |
| `POST /api/v1/parents/notifications/:id/read` | token | | `204` |
| `POST /api/v1/parents/notifications/read-all` | token | | `204` |
| `POST /api/v1/parents/push-tokens` | token | `{ token, platform }` (`ios` or `android`) | `204`; it saves the Expo push token, or moves it to this parent |

The shapes:

```ts
type ParentJson = { id: string; firstName: string; lastName: string; email: string; mobile: string };
type ChildToday = {
  id: string; firstName: string; lastName: string; gradeLevel: number; section: string;
  photo: string | null;            // "/api/v1/photos/…", loaded with the same Bearer token
  school: { id: string; name: string; notificationPreference: "off" | "time_in_only" | "time_in_and_time_out" };
  today: { date: string; status: "present" | "late" | "absent" | "idle";
           flexible: boolean; timeIn: string | null; timeOut: string | null; tapCount: number };
};
type Item = { id: string; childId: string; childName: string; kind: "time_in" | "time_out"; at: string; read: boolean };
```

The status names are the web's own (`AttendanceStatus`): `idle` means no tap yet. On a weekend `flexible` is true, and the app shows "Came in" or "No tap" instead, the same as the web's `statusLabel(status, flexible)` (Step 44.6). Times are ISO strings with the `+08:00` offset. **Never in any answer:** the LRN, the birth date, the guardian's name and mobile, or other students.

**Errors** always look the same, so the app has one error handler:

```json
{ "error": { "code": "invalid_input", "message": "Check the highlighted fields.", "fields": { "email": "Enter a valid email address" } } }
```

| Code | Status | When |
|---|---|---|
| `invalid_input` | 400 | Zod failed; `fields` holds the messages, the same ones the web shows |
| `unauthorized` | 401 | no token, or not a working one; the app goes back to sign-in |
| `wrong_credentials` | 401 | login failed |
| `too_many_tries` | 429 | the throttle |
| `not_found` | 404 | not theirs, or doesn't exist (never "forbidden", as in Step 51) |
| `conflict` | 409 | email taken, child already linked |

`src/features/parents/api-responses.ts` holds `apiError(code, message, fields?)` and the `to…Json` functions that copy fields one by one, like `toGateTapResponse`. A unit test checks the exact keys of each, so a new field is a deliberate decision.

### 4. Photos for parents

`resolvePhotoViewer` (`src/services/photos/photo-viewer.ts`) gains a third kind of Bearer token. A `tal_par_` token is a parent, who may see a photo only when its key's student is one of their linked children. `canViewPhoto` gets a test row for each: own child, another child at the same school, and another school.

### 5. `docs/PARENT-API.md` (new topic doc, linked from the README)

This is the app's contract, written for tomorrow:
- every address above, with a `curl` example and a real answer;
- the error codes;
- token handling: save it in `expo-secure-store`, send it as `Authorization: Bearer`, go to sign-in on any `401`;
- where push tokens fit;
- "What the app never receives".

`ARCHITECTURE.md`'s endpoint table and auth section point to it instead of repeating it.

### 6. Tests

- **Unit:**
  - `parent-token.test.ts`: issue then authenticate; revoked; 90 days unused; a gate token is not a parent token.
  - Each service: the cases the web actions test today, moved.
  - `childrenToday`: a weekday, a weekend, a child with 3 taps.
  - Notification paging: `before` and `limit`.
  - `api-responses.test.ts`: exact keys, and no LRN or birth date anywhere.
- **Browser, API only** (`e2e/parent-api.spec.ts`, Playwright's `request`, no page):
  1. Sign up a new parent (no school) and get a token. List the schools.
  2. `GET /me` shows no children. Link a seed student by school, LRN, last name and birth date; `/me` now shows them, with their school.
  3. Tap that student's card through the gate API (the test gate token).
  4. `GET /notifications` has the new time in. Mark it read; `unreadCount` drops. With `limit=1`, `nextBefore` leads to the next page.
  5. The child's photo loads with the token. Another student's photo gives `404`.
  6. Log out; `GET /me` gives `401`.
  7. Six wrong passwords give `429`.
- `e2e/parent.spec.ts` (the web portal) runs unchanged and must stay green.

## Docs to update with this step

- **`docs/COMMANDS.md`:** a "Parent API" section with the `curl` sign-in, `/me` and notifications examples below, and how to get a token.
- **`docs/PARENT-API.md`:** new, the contract for the Expo app.

## Verify it worked

1. Your checks: the routine in `docs/LEARNING-LOG.md` ("The routine to run before every commit and push"), including `npx playwright test`.
2. With `npm run dev` running, sign in from a terminal:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/parents/login -H 'Content-Type: application/json' \
     -d '{"email":"parent-one@balanga.example","password":"Talaan123!","deviceLabel":"curl"}'
   ```
   You get a `token` starting with `tal_par_`.
3. `curl -s http://localhost:3000/api/v1/parents/me -H "Authorization: Bearer <token>"` lists that parent's linked children, each with today's status.
4. Tap one of those children's cards with the gate (or Simulate a tap on the dashboard), then fetch `/api/v1/parents/notifications`: the new entry is first.
5. The web portal at `/parent` works exactly as before.

## What's next

The notification outbox and its worker: each queued notification is actually sent to the parent's phone through Expo's push service (free), with retries, so a tap at the gate buzzes the phone in the parent's pocket.
