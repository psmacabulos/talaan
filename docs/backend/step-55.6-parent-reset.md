# Step 55.6: Parents reset a forgotten password

> **Written before the code, on 2026-10-23, and approved by the owner the same day as one step.** Updated after building where the real code differs; see "Changed while building". Cut from Step 55.5, whose email service and daily email limit this step reuses. The systems-architect reviewed the plan once; its points are included below (one blocking, now fixed). If building changes anything, this file is updated to match before the review report. Topic docs to update while building: `docs/PARENT-API.md`, `docs/AUTH.md`, `docs/EMAIL.md`, `docs/COMMANDS.md`, and the app's starter kit (`mobile/starter/docs/PLAN.md`, `SERVER.md`).

## Why

A parent who forgets their password today has no way back in. Asking the school doesn't help: the school can't see or change a parent's password, and the plan says people recover their own accounts. This step adds:

1. **A 6-digit code by email**, asked for in the app or on the web portal, that works for 15 minutes.
2. **A new password with that code**, which signs the parent in on the phone or browser they used, and signs them out everywhere else.

Staff got a link (Step 55.5). Parents get a code, because they're usually on a phone: the email arrives in Gmail, and a link would open the phone's browser, not the app. A 6-digit code can be typed into the app straight from the email (or filled in by the keyboard).

## What it costs

Nothing new. Step 55.5's Resend account sends the codes, and they count against the same 80 emails a day. One more small table in the database: a few rows per reset, holding only hashes and times.

## Decisions

1. **One row per code sent**, in a new `ParentPasswordReset` table: `id`, `parentId`, `codeHash`, `expiresAt`, `tries`, `usedAt`, `createdAt`. The code itself is never stored, and never logged.
2. **The code is hashed with the server's secret**, the way `LinkAttempt` hides LRNs: `HMAC-SHA256(SESSION_SECRET, "parent-reset:" + id + ":" + code)`. A plain sha256 wouldn't be enough: there are only a million 6-digit codes, so anyone holding a copy of the database could try them all in a second. Without the secret, they can't. The code is made with `crypto.randomInt(0, 1_000_000)`, padded to 6 digits.
3. **15 minutes, 5 tries, one use.** Only the parent's newest code works, so asking again makes the old one useless.
4. **A try is spent before the code is checked.** One database statement adds 1 to `tries`, only while the code is unused, unexpired and under 5 tries. If it changes nothing, the code is dead. Only then is the typed code compared (with `timingSafeEqual`). So 100 guesses sent at the same moment still get only 5 checks, because each must win its try first.
5. **Limits on asking for a code:**
   - 3 per email per hour (in memory, a new `parentResetEmailThrottle`, keyed `parent-reset:<email>`);
   - 20 per network per hour, the same count staff resets use (`resetAddressThrottle`);
   - **5 codes per parent per 24 hours, counted in the database** (architect: worth it). The in-memory limits are cleared by every restart, including Heroku's daily one, so on their own a parent could be sent about 72 codes a day. Counted in the database, it's 5 whatever happens.
   - the app's 80 emails a day (Step 55.5).

   So someone guessing gets at most 5 codes × 5 tries = **25 guesses a day out of a million**, and every one of those codes lands in the real parent's inbox.
6. **The same answer for every email.** "If that email belongs to a parent account, we've sent a 6-digit code to it. It works for 15 minutes." As in Step 55.5, the lookup and the email happen in `after()`, once the answer has gone. (Architect: sign-up already says "That email already has an account", so whether an email has an account isn't secret. The same answer is kept anyway; it costs nothing.)
7. **No email possible means no promise** (architect, the blocking point). On a live server still on `EMAIL_SENDER=log`, the log sender reports success but sends nothing. The web page can hide its link (`canEmailPeople()`, Step 55.5), but the app can't know. So the service itself answers `unavailable` when `canEmailPeople()` is false, and the API says `503 unavailable` with "We can't send emails right now. Try again later." The daily limit gives the same answer.
8. **Code and new password in one request.** The app's second screen asks for the code and the new password together, and sends both. A wrong code keeps what was typed, so nothing is lost. A separate "check the code first" request would need a second short-lived token between the two screens, for little gain.
9. **One answer for every failed code:** "That code isn't right, or it has expired. Check the newest email, or ask for a new code." The same for a wrong code, an expired one, one used up, one already used, and an email with no account. Its own error code, `invalid_code` (400), never a `401`, because the app treats every `401` as "signed out".
10. **Wrong codes count against the network's sign-in limit** (`parentAddressThrottle`: 30 in 15 minutes), the same as wrong passwords, so someone can't try codes for many emails from one place. (Architect's caution: on mobile data, many phones can share one network address, so this can lock out other parents there. It's the same trade-off sign-in already makes; watch the "locked" log lines.)
11. **A reset signs the parent out everywhere else:**
    - **Phones:** every one of the parent's `ParentToken` rows is deleted. The database then removes each phone's push address and its pending pushes with it (`onDelete: Cascade`, architect checked). Deleting rather than revoking is what the hourly cleanup would do anyway.
    - **Web browsers:** the parent cookie gains `pv`, the password fingerprint staff cookies already carry (Step 50). A new password changes the fingerprint, so every older cookie stops working.
    - The phone or browser that did the reset is signed in again: the app gets a new token (the same answer as sign-in), the web gets a new cookie.
12. **The new password, the stored code and the sign-outs are one transaction:** mark the code used (it must change exactly one row, or the whole thing is undone), store the new hash, delete the parent's tokens and reset rows. The new password is hashed *before* the transaction starts, since scrypt is slow on purpose and shouldn't hold the database. So two requests with the same right code at once can't both win.
13. **After the reset:** that email's sign-in lockout is cleared (as for staff), and "Your Bantay Aral password was changed" is emailed, the same text staff get.
14. **Every parent web session ends once, at this deploy.** Today's parent cookies have no `pv`, so they stop working and each parent signs in again. Only demo parents exist, so that's fine. Phones (bearer tokens) aren't affected.
15. **The code email**, text only, as in Step 55.5. The code is in the body, not the subject, so it doesn't show on a locked phone's notification:

    ```
    Subject: Your Bantay Aral password reset code

    Hi Maria,

    Someone asked to reset the password for your Bantay Aral parent account, maria@example.com.
    Your code is:

    482913

    It works for 15 minutes. If you didn't ask for it, you can ignore this email. Your password stays the same.
    ```

```mermaid
sequenceDiagram
    participant P as Parent (app or web)
    participant API as Server
    participant DB as Postgres
    participant M as Resend
    P->>API: POST /password-reset { email }
    API->>API: email works? limits: 3/h email, 20/h network, 80/day app
    API-->>P: 202 {} (the same for every email)
    Note over API,DB: after(): once the answer has gone
    API->>DB: parent by email; codes in 24 h < 5? new row (hash only)
    API->>M: "Your code is 482913" (15 minutes)
    P->>API: POST /password-reset/confirm { email, code, password }
    API->>DB: spend 1 try (only if unused, unexpired, under 5)
    API->>API: compare HMAC of the typed code
    API->>DB: one transaction: code used, new hash, delete every phone's sign-in
    API-->>P: 200 { token, parent } (web: new cookie, go to /parent)
    API->>M: after(): "Your password was changed"
```

## Your part

Nothing new. Step 55.5's Resend settings cover it. On a live server still on `EMAIL_SENDER=log`, the web page shows a note instead of the link and the app gets `503`, as decision 7 says.

## Steps

### 1. The table (`prisma/schema.prisma`)

```prisma
// A "forgot your password" code for a parent (Step 55.6). Never the code
// itself: an HMAC of it with the server's secret, since a million codes
// could otherwise all be tried against a copy of this table in a second.
// Deleted when the reset succeeds, and the parent's rows older than a day
// are deleted the next time they ask.
model ParentPasswordReset {
  id        String    @id @default(uuid())
  parentId  String
  parent    Parent    @relation(fields: [parentId], references: [id], onDelete: Cascade)
  codeHash  String
  expiresAt DateTime
  // Spent before the code is checked, so at most 5 checks per code.
  tries     Int       @default(0)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  // "This parent's newest code" and "codes in the last 24 hours".
  @@index([parentId, createdAt])
}
```

Plus `passwordResets ParentPasswordReset[]` on `Parent`. Then:

```bash
npx prisma migrate dev --name parent_password_resets
```

and read the generated SQL: one `CREATE TABLE`, one index, one foreign key, nothing else.

### 2. The repository (`src/data/repositories/parent-password-reset-repository.ts`, plus a Prisma one)

```ts
export type StoredParentReset = { id: string; codeHash: string; expiresAt: string; tries: number; usedAt: string | null };

export interface ParentPasswordResetRepository {
  /** How many codes this parent was sent since `since`. Deletes their older rows first. */
  countRecent(parentId: string, since: string): Promise<number>;
  create(row: { id: string; parentId: string; codeHash: string; expiresAt: string }, now: string): Promise<void>;
  /** The parent's newest code since `since`, or null. Never an older one. */
  newest(parentId: string, since: string): Promise<StoredParentReset | null>;
  /** Adds 1 to `tries` only while unused, unexpired and under `maxTries`. False when the code is dead. */
  spendTry(id: string, now: string, maxTries: number): Promise<boolean>;
  /**
   * One transaction: marks the code used (exactly one row, or it throws and
   * nothing changes), stores the new hash, deletes every sign-in of the
   * parent (their push addresses go with them) and every reset row.
   * False when another request used the code first.
   */
  complete(id: string, parentId: string, passwordHash: string, now: string): Promise<boolean>;
}
```

An in-memory version for unit tests, as `createMockParentTokenRepository` does. Exported from `src/data/repositories/index.ts`.

`ParentRepository` gains `getForSession(id)`, returning the parent and their password hash (the same as `StaffRepository.getForSession`), for the cookie's `pv`.

### 3. The code (`src/services/parents/reset-code.ts`)

- `RESET_CODE_MINUTES = 15`, `RESET_CODE_MAX_TRIES = 5`, `RESET_CODES_PER_DAY = 5`.
- `makeResetCode()`: `String(randomInt(0, 1_000_000)).padStart(6, "0")`.
- `hashResetCode(id, code, secret)`: the HMAC of decision 2.
- `resetCodeMatches(stored, id, typed, secret)`: `timingSafeEqual` of the two hashes.
- `resetCodeSchema` (trimmed, exactly 6 digits, "Enter the 6-digit code from the email") lives in `src/features/parents/auth-schemas.ts` instead, since the web form needs it and this file uses `node:crypto`, which can't go to the browser.

### 4. Asking for a code (`src/services/parents/parent-password-reset.ts`)

```ts
export function startParentPasswordReset(email: string, address: string | null, deps: ParentResetDeps): StartResetResult;
```

The same shape as `startStaffPasswordReset` (Step 55.5), and the same result type:

1. `!deps.canEmail` or the daily limit is reached → `unavailable`.
2. The email or the network is locked → `too_many`. Otherwise count one against each, known email or not.
3. `accepted`, with `send` for `after()`:
   - `parents.findByEmail(email)`; none → nothing is sent;
   - `resets.countRecent(parent.id, 24 hours ago)` ≥ 5 → nothing is sent, and the log says `email: parent reset code not sent, 5 codes for this parent today` (no email address);
   - the daily email limit is checked again (architect's code review: a code stored but never sent would use up one of the day's 5);
   - make the code, `resets.create(...)`, and send it through `sendCappedEmail` with `what` = `parent reset code` (so the daily limit counts it, and its failures read `email: parent reset code failed: EAUTH`);
   - catch everything and log only `email: parent reset code failed: lookup`.

   Every line starts with `email:`, so Step 55.5's `grep "email:"` finds these too.

### 5. Using the code (same file)

```ts
export type ConfirmResetResult =
  | { ok: true; parent: Parent }
  | { ok: false; code: "invalid_input"; fieldErrors: … }
  | { ok: false; code: "invalid_code" | "too_many_tries"; formError: string };

export async function confirmParentPasswordReset(input: unknown, deps: ConfirmResetDeps): Promise<ConfirmResetResult>;
```

1. Zod: `{ email: emailSchema, code: resetCodeSchema, password: passwordSchema }` (the sign-up rules for the password).
2. The network is locked (`parentAddressThrottle`) → `too_many_tries`.
3. Find the parent, then `resets.newest(parent.id, …)`. Either missing → `invalid_code`.
4. `resets.spendTry(...)` false → `invalid_code`.
5. The code doesn't match → `invalid_code`.
6. `hashPassword(password)`, then `resets.complete(...)`. False → `invalid_code` (the other request won).
7. `parentSignInThrottle.recordSuccess(parentThrottleKey(email))`, and return the parent with `notify`, which sends "Your password was changed". The caller signs in this phone or browser and passes `notify` to `after()`.

Every `invalid_code`, whichever step gave it, counts one against the network (`parentAddressKey`, shared with sign-in), so trying codes for many unknown emails is limited too.

### 6. The API (`src/app/api/v1/parents/password-reset/route.ts` and `…/confirm/route.ts`)

| Method and address | Token | Body | Success |
|---|---|---|---|
| `POST /api/v1/parents/password-reset` | no | `{ email }` | `202 {}` |
| `POST /api/v1/parents/password-reset/confirm` | no | `{ email, code, password, deviceLabel? }` | `200 { token, parent }`, the same as login |

`202` with `{}` rather than `204`, so the app's JSON reading doesn't trip on an empty body (architect). Errors: `invalid_input` (400), `invalid_code` (400, new), `too_many_tries` (429), `unavailable` (503, new). Both added to the errors table in `docs/PARENT-API.md`.

### 7. Web sessions (`src/lib/session-cookie.ts`, `src/lib/parent-session.ts`)

- The parent cookie becomes `{ parentId, pv }`.
- `resolveParentSession` uses `getForSession` and refuses a cookie whose `pv` doesn't match, the same as staff.
- `setParentSession(parentId)` looks up the hash itself, so its callers (sign-up, sign-in, reset) don't change.
- Seed parents get the fixed demo hash (`SEED_PARENT_PASSWORD_HASH`, the same value as `SEED_STAFF_PASSWORD_HASH`, since it's the same demo password, in `src/data/seed/staff-password.ts`), so `e2e/sessions.ts` can make a parent cookie with the right `pv`, as it does for staff.

### 8. The web page

- **`src/app/parent/forgot-password/page.tsx`**: the parent sign-in page's layout. When `canEmailPeople()` is false, a note: "Password reset by email isn't set up yet. Try again later."
- **`src/features/parents/forgot-password-form.tsx`**, one client component in two stages:
  1. Email, "Send code" (disabled while sending), "Back to sign in".
  2. The answer (with `aria-live`), the email it went to, then "6-digit code" (`inputMode="numeric"`, `autoComplete="one-time-code"`), "New password", "Confirm new password", and "Set new password". Below: "Didn't get it? Check your spam folder, or send a new code" (the button waits 30 seconds after each send) and "Use a different email".

  The email is kept in the component, never in the address bar (Step 55.5: the address bar lands in Heroku's logs). Focus moves to each stage's first field.
- **Actions** in `src/features/parents/auth-actions.ts`: `requestParentPasswordReset({ email })` and `resetParentPassword(email, { code, password, confirmPassword })`. The second signs the browser in and goes to `/parent`.
- **`/parent/login`** gets "Forgot your password?" under the password field, only when `canEmailPeople()` is true.
- **Both pages call `await connection()`** first, so they're rendered per request and read `EMAIL_SENDER` as it is now, not as it was at build (`docs/PROBLEMS-LOG.md`, P-035).

### 9. The app's starter kit

- `mobile/starter/docs/PLAN.md`: the "No Forgot password? link yet" line becomes the two screens: email, then code + new password. Keep only the email between them, in the screen's state (not SecureStore); trim the code and check it's 6 digits; `textContentType="oneTimeCode"` / `autoComplete="one-time-code"`; a "Send a new code" button that waits 30 seconds; after `200`, store the token as login does and register the push address again (the reset removed it).
- `mobile/starter/docs/SERVER.md`: the new limits, and that the demo parent's codes appear in the `npm run dev` terminal.

### 10. Tests

- `reset-code.test.ts`: always 6 digits; the hash depends on the secret and the row id; a wrong code doesn't match.
- `parent-password-reset.test.ts` (mock repositories, fake sender):
  - a known email gets one email whose code works once, and the answer is `accepted` for an unknown one too, with nothing sent;
  - the 4th request in an hour for one email and the 21st from one network → `too_many`; a 6th code in 24 hours isn't sent;
  - no email possible, or the daily limit reached → `unavailable`;
  - 5 wrong codes kill the code, even the right one after;
  - an expired code, a used code, an older code after a newer one → `invalid_code`;
  - a right code stores the new password, removes every phone's sign-in and its push address, and clears the sign-in lockout.
- `prisma-parent-password-reset.pg.test.ts` (real Postgres): `spendTry` never goes past 5 with 20 tries at once; two `complete` calls at once, only one wins; the cascade removes push addresses.
- `parent-session.test.ts`: a cookie with an old `pv` is refused.
- `forgot-password-form.test.tsx`: the two stages, inline errors, input kept after `invalid_code`.
- `password.test.ts`: the parents' fixed seed hash is still the hash of their demo password.
- **e2e** (`e2e/login.spec.ts`): from `/parent/login` to the forgot page, the same answer for a seeded parent and a made-up email, and a wrong code keeps what was typed; `e2e/a11y.spec.ts`: the page is axe-clean in light and dark.
- **e2e, the API** (`e2e/parent-api.spec.ts`): `202 {}` for a real and a made-up email; then a whole reset for a new account. A browser test can't read an email, so `e2e/known-reset-code.ts` stores a code the test knows, hashed with the test server's secret exactly as the server would. A wrong code gets `400 invalid_code`, the right one `200` with a new token, the old token then gets `401`, the code can't be used twice, and only the new password signs in.

## Verify it worked

1. `npx prisma migrate deploy` (it was applied to your database while building, so it should say "No pending migrations"), then **stop and restart `npm run dev`**: a running server keeps the old Prisma Client, which doesn't know the new table (`docs/PROBLEMS-LOG.md`, P-031).
2. Sign in on the web as the demo parent (`parent-one@balanga.example`, `Talaan123!`). Keep that window open.
3. In a private window, open http://localhost:3000/parent/login → **Forgot your password?** → the same email → **Send code**. The `npm run dev` terminal shows the email with the code.
4. Type a wrong code with a new password: "That code isn't right…", and what you typed stays.
5. Type the right code: you land on `/parent`, signed in with the new password.
6. Back in the first window, reload: you're signed out.
7. The same from the API, with the curl lines added to `docs/PARENT-API.md`: sign in with curl first, reset, and the first token now gets `401`.
8. Phone width (360px) and desktop (1280px), light and dark.
9. Afterwards, `npm run db:reset` puts the demo password back (or reset it again to `Talaan123!`).

## If something goes wrong

- **`503 unavailable` on the live server:** `EMAIL_SENDER` is still `log`. Step 55.5's "Your part" has the settings.
- **The code always says "isn't right":** a newer code was sent; only the newest works. Or 15 minutes have passed.
- **Every parent is signed out of the web after deploying:** expected once (decision 14).

## What you'll learn

- Why a short code needs a secret in its hash, and a limit on tries, when a long random link needs neither.
- How to stop parallel guesses: spend the try in the database before checking.
- How one database transaction keeps "new password" and "sign out everywhere" from ever happening apart.

## Where it's documented

So you know where to look when reviewing (owner request, 2026-10-23). Each of these is written in the same change as the code:

| What | Where |
|---|---|
| The two new addresses, their bodies and answers, with `curl` lines | `docs/PARENT-API.md` ("The addresses", and a new "Password reset" section) |
| The new error numbers: `invalid_code` (**400**) and `unavailable` (**503**), when each comes, and what the app does | `docs/PARENT-API.md` ("Errors" table) |
| The subtlety behind `503`: a live server on `EMAIL_SENDER=log` reports "sent" but sends nothing, so the server refuses instead of promising | `docs/PARENT-API.md` ("Errors") and `docs/EMAIL.md` |
| The new log lines (`email: parent reset code …`) and the parent messages | `docs/EMAIL.md`'s "What the log says, and what people see" tables |
| `curl` commands to try both addresses locally | `docs/COMMANDS.md` section 7d |
| Symptoms: `503`, "That code isn't right…", 5 codes a day, every parent signed out of the web after the deploy | `docs/COMMANDS.md` section 9 |
| How the parent cookie's `pv` signs browsers out | `docs/AUTH.md` |
| What the app must build (two screens, what to keep between them) | `mobile/starter/docs/PLAN.md` and `SERVER.md` |

## Before you commit

The full routine in `docs/LEARNING-LOG.md`: `npm run lint`, `npm run check:tokens`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. Then the steps in "Verify it worked".

Suggested commit: `feat(parents): reset a forgotten password with an emailed code`

## Known limits

- **A sign-in racing a reset** (architect): someone signing in with the old password in the same few milliseconds could get a phone token after the reset deleted them. It needs the old password and split-second timing. Web cookies aren't affected (their `pv` is old).
- **Old reset rows of parents who never ask again stay** (at most 5 per parent, hashes and times only). The architect suggested adding them to the push worker's hourly cleanup; left out to keep that worker about pushes. Step 60's privacy cleanup is the place.
- **The in-memory limits clear on restart**; the database's 5 codes a day doesn't.
- **Shared mobile networks** can hit the network limit together (decision 10).

## Changed while building

- **No rename of the seed hash.** The plan renamed `SEED_STAFF_PASSWORD_HASH` and moved its file; that touched about 10 files for no change in behaviour. Instead `staff-password.ts` exports `SEED_PARENT_PASSWORD_HASH`, the same value.
- **`resetCodeSchema` moved to `auth-schemas.ts`**, so the browser form doesn't pull in `node:crypto`.
- **Both parent pages render per request** (`await connection()`), found while building (`docs/PROBLEMS-LOG.md`, P-035).
- **Every failed code counts against the network**, not only a wrong one, so unknown emails count too.
- **`confirmParentPasswordReset` returns `notify`** for the caller's `after()`, the same shape as the request's `send`.
- **The Postgres test uses a parent of its own**, created and removed by the test, so the demo parent's password and sign-ins are never touched.
- **The API browser test does a whole reset**, with a code the test stores itself (Tests, above).
- **The browser-test database needed the migration** before the Postgres test could run, as in Steps 55 and 55.2: Playwright's setup migrates it only when it runs. The command is now in `docs/COMMANDS.md` section 3.
- **`npm run db:reset` now empties parents too** (owner's review, `docs/PROBLEMS-LOG.md` P-036). It emptied only `School` and what links to it, so parents, which belong to no school since Step 53, survived with their old hash, and the browser tests' parent cookie (with the new hash's fingerprint) was refused. `prisma/reset-demo.ts` now runs `TRUNCATE "School", "Parent" CASCADE`.
- **The architect's code review** found nothing blocking. Taken:
  - the daily limit is checked again before a code is stored;
  - `docs/PARENT-API.md` says what to do after a `5xx` from confirm (the password may already have changed: go to sign-in);
  - the sign-in racing a reset is written down in `docs/AUTH.md`.

  Not taken: `id` as a second sort key in `newest` (ids are random, so it wouldn't pick the newer of two codes made in the same millisecond either), and a cleanup job for old rows (Known limits).

## What's next

Step 56: one read, one tap.
