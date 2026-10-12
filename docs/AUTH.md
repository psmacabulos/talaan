# How sign-in works

Talaan has four kinds of sign-in, one per kind of visitor:

| Who | Proves who they are with | Carries | Built in |
|---|---|---|---|
| Staff (super admin, principal, teacher) | Email and password | A **signed** `talaan_session` cookie | Steps 50 and 50.1 |
| Parents, web portal | Email and password | A **signed** `talaan_parent_session` cookie | Step 22; hashed passwords Step 41; signed Step 50.1 |
| Gate tablet, guardhouse TV | A device token typed once | A random `tal_dev_…` token, kept hashed | Steps 43 and 48 (`docs/GATE.md`) |
| Parents, Expo app | Email and password | A random `tal_par_…` token, kept hashed | Step 53 |

This page covers the two cookie sessions. For a step-by-step walkthrough of every journey (getting an account, signing in, every page load, signing out, and the planned phone app), see [Talaan Accounts and Sign-in](https://claude.ai/artifact/2cQbiVqHAhz3cYs1Tjtqhz). For what cookies, sessions and JWTs are, and why Talaan signs its own cookie instead of using an auth library, see the interactive page [Talaan Sign-in Options](https://claude.ai/artifact/3AsAcMHFBbZbzjJya1tZAK) and `docs/LEARNING-LOG.md`'s "Cookies, sessions and JWTs" entry.

## The staff session (Step 50)

```mermaid
flowchart LR
    subgraph start["Signing in"]
        Dev["Dev switcher / demo shortcuts<br/>setDevSession()<br/>throws in production"]
        Open["Open school<br/>openSchool()"]
        Form["Sign-in form<br/>signIn() checks the password"]
    end
    Dev --> Start["startStaffSession(staffId, school?)<br/>src/lib/session.ts<br/>not a Server Action"]
    Open --> Start
    Form --> Start
    Start --> Cookie["talaan_session cookie<br/>{ staffId, pv, school?, exp }.stamp<br/>httpOnly, 30 days"]
    Cookie --> Get["getSession()<br/>stamp? expiry? staff exists?<br/>pv matches?"]
    Get -->|yes| Session["{ userId, role, schoolId }"]
    Get -->|no| Null["null"]
    Session --> Pages["requireSession() in the layout and every page"]
    Session --> Actions["getSession() in every Server Action"]
    Null --> Login["pages: redirect to /<br/>actions: 'Your session has expired'"]
```

### The cookie

`src/lib/session-cookie.ts` makes and reads the cookie's value:

```ts
export function makeStaffSessionCookie(contents: StaffSessionCookie, secret: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  return signValue({ ...contents, exp }, "staff-session", secret);
}
```

The value looks like `eyJzdGFmZklk….tQdbZ2Hik4CI…`: a base64url JSON payload, a dot, and a stamp. `src/lib/signed-value.ts` makes the stamp with HMAC-SHA256 over the purpose and the payload, using `SESSION_SECRET` (`src/lib/env.ts`). Change one character of the payload or the stamp, use another secret, or paste a value made for another purpose (a parent cookie, a set-password link), and `readSignedValue` returns null. It also returns null once `exp` has passed. It never throws, so a garbage cookie just means "signed out".

The payload is readable by anyone holding the cookie, since it's only encoded, not encrypted. It holds ids and a fingerprint, never a password or a student's details.

| Field | What it's for |
|---|---|
| `staffId` | Who signed in. |
| `pv` | `passwordVersion(passwordHash)` (`src/lib/password.ts`): the first 16 characters of a SHA-256 of the stored hash, or `"none"` for an invited account with no password yet. A new password means a new hash, so older cookies stop matching. That's how a password change signs out every other browser, with no sessions table. |
| `school` | The school a super admin opened. Ignored for everyone else. |
| `exp` | 30 days after sign-in, in seconds since 1970. |

### Reading it: `resolveSession`

```ts
export async function resolveSession(raw: string | undefined, deps: SessionDeps): Promise<Session | null> {
  const cookie = readStaffSessionCookie(raw, deps.secret, deps.now);
  if (!cookie) return null;

  const found = await deps.staff.getForSession(cookie.staffId);
  if (!found || passwordVersion(found.passwordHash) !== cookie.pv) return null;

  const { staff } = found;
  if (staff.role !== "super_admin") {
    return { userId: staff.id, role: staff.role, schoolId: staff.schoolId };
  }
  const viewing = cookie.school ? await deps.schools.getById(cookie.school) : null;
  return { userId: staff.id, role: staff.role, schoolId: viewing?.id ?? null };
}
```

- **One database lookup per request.** The stamp proves the cookie is ours. The lookup proves the person is still allowed in: a removed staff member is signed out on their next click, not in 30 days. `getSession` is wrapped in React's `cache`, so the layout and the page share that one lookup.
- **The school only ever comes from this signed cookie.** A principal's or teacher's school is their own, whatever the cookie says. Only a super admin's `school` is read, and only if that school still exists.
- **The real clock.** `getSession` passes `new Date()`, never `DEMO_NOW`: a cookie's expiry is about real time, even when the attendance pages are pinned to the demo morning.

### Pages and actions

| Where | Call | Signed out |
|---|---|---|
| `src/app/(app)/layout.tsx` and every page under it | `requireSession()` | Redirect to `/` |
| Every staff Server Action | `getSession()`, then `if (!session) …` | `{ ok: false, formError: SIGNED_OUT_MESSAGE }` (or a thrown error for the two that already threw) |
| `resolveMonitorViewer`, `resolvePhotoViewer` | `getSession()` | Not allowed (the monitor's not-connected page, a photo 404) |

Each page checks for itself, not only the layout: Next.js doesn't re-run a layout on every navigation, and a Server Action can be called directly without any page at all (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Layouts and auth checks").

### Starting a session

`startStaffSession(staffId, school?)` in `src/lib/session.ts` sets the cookie (httpOnly, `sameSite: "lax"`, `secure` in production, 30 days). It is **not** a Server Action, on purpose. Every exported function in a `"use server"` file is a public endpoint that anyone can call with any arguments, and this function takes any staff id. So it's only called by server code that has already decided the person may sign in:
- `setDevSession` (`src/lib/session-actions.ts`), the dev switcher and demo shortcuts, which throws in production;
- `openSchool` (`src/features/schools/actions.ts`), after checking the caller is a super admin;
- `signIn`, the sign-in form's action, after the password checks out (below).

`endStaffSession()`, next to it, deletes the cookie. Sign out (`signOut` in `src/features/auth/actions.ts`) calls it, clears any theme preview, and goes to `/`.

### Passwords and emails

`Staff.passwordHash` (migration `staff_password`) holds `hashPassword()`'s `scrypt:<salt>:<hash>`, or null for an invited account. `toStaff` never copies it into a `Staff` object; only `StaffRepository.getForSession` returns it, next to the staff member. Emails are unique across every school and stored in lower case, so sign-in will find exactly one person. Adding staff or a school with an email that's already used is refused with "Someone already uses this email."

Seed accounts: every **active** demo staff member's hash is `SEED_STAFF_PASSWORD_HASH` (`src/data/seed/staff-password.ts`), the hash of `Talaan123!`, made once and kept fixed so the browser tests can compute the matching `pv`. Invited demo accounts have no password, the same as a real invited account.

### The browser tests

`e2e/sessions.ts` makes the same signed cookie with `TEST_SESSION_SECRET`, which `playwright.config.ts` gives the test server as `SESSION_SECRET`. `signInAs(context, "principal", baseURL)` works exactly as before.

### Signing in with the form (Step 50.1)

```mermaid
flowchart LR
    Form["/ sign-in form"] --> SignIn["signIn()<br/>loginSchema again"]
    SignIn --> Check["checkStaffSignIn()<br/>src/services/auth/staff-sign-in.ts"]
    Check -->|locked| Many["Too many tries.<br/>Wait 15 minutes and try again."]
    Check -->|no account, no password, wrong password| Wrong["That email or password isn't right."]
    Check -->|right| Start["startStaffSession()<br/>then /dashboard"]
```

`checkStaffSignIn(input, { staff, throttle, now })` is a plain function, so it's unit-tested without Next.js:

1. **The limit first.** A locked email is refused before the password is looked at, so the right password can't be found by guessing past the limit.
2. **`findForSignIn(email)`** finds the account and its hash, ignoring case.
3. **`passwordMatches` always runs**, against a decoy hash when there's no account or no password yet. Without it, an unknown email would answer a few dozen milliseconds faster than a known one, and that difference alone would tell a stranger which emails have accounts.
4. **One answer for every failure:** "That email or password isn't right." The 5th failure in 15 minutes answers "Too many tries. Wait 15 minutes and try again." instead (`src/features/auth/messages.ts`).

**The limit** (`src/services/auth/login-throttle.ts`) counts wrong passwords per key: `staff:<email>` or `parent:<email>`, so the two never share a count. 5 within 15 minutes lock that key for 15 minutes; a right password clears the count. It lives in the server's memory: on one server that covers every request, and a restart clears it. With several servers, each would count on its own; it would then move to the database. It uses the real clock, never `DEMO_NOW`.

**The page.** `/` sends a signed-in visitor straight to `/dashboard`. The "Try the prototype as" buttons only render outside production, where `setDevSession` works; in production the form is the only way in. **Sign out** is a `<form action={signOut}>` button (`src/components/app-shell/sign-out-button.tsx`) in the top bar (icon only below md) and at the bottom of the mobile drawer, so it works before JavaScript loads.

## The parent session

The parent web portal works the same way, with its own cookie and code:

- **`talaan_parent_session`** holds `makeParentSessionCookie(parentId, …)` (`src/lib/session-cookie.ts`): a signed `{ parentId, exp }` with the purpose `parent-session`, 30 days, httpOnly, `secure` in production. A hand-typed parent id, or a staff cookie pasted in its place, is signed out.
- **`resolveParentSession(raw, deps)`** (`src/lib/parent-session.ts`) checks the stamp and that the parent still exists. `getParentSession()` wraps it, and `src/app/parent/(protected)/layout.tsx` redirects to `/parent/login` when it's null.
- **`setParentSession` and `clearParentSession`** live in `parent-session.ts`, which has no `"use server"`. Until Step 50.1 `setParentSession` was in its own `"use server"` file, which made it a public endpoint: anyone could have asked it to sign them in as any parent.
- **`signInParent`** uses the same limit (key `parent:<email>`) and the same messages as staff.

The two sessions never share a cookie: a browser can be signed in as staff and as a parent at the same time.

**The phone app is different.** Parents will mostly use the Expo app (Phase 3), which can't hold this cookie. Step 53 gives it a bearer token (`tal_par_…`, kept hashed) through `/api/v1/parents/login`, and moves the parent sign-in check into a service both the web portal and the API call. So the limit and the single "isn't right" answer apply to the app too.

## Quick recipes

**A new staff page.** Put it under `src/app/(app)/` and start it with `const session = await requireSession();`. Check the role yourself (`hasNavAccess`) if the page isn't for everyone.

**A new staff Server Action.**

```ts
const session = await getSession();
if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
if (!session.schoolId || session.role === "teacher") return { ok: false, formError: "You don't have permission to …" };
```

`SIGNED_OUT_MESSAGE` is in `src/features/auth/messages.ts`. Use `session.schoolId` for every lookup, never a school id the browser sent.

**Sign everyone out.** Change `SESSION_SECRET`. Every cookie's stamp stops matching.

**Sign one person out everywhere.** Change their password (Step 50.5's reset link). Their `pv` changes.

**A new kind of signed value** (a link, another cookie). Add a purpose to `SignPurpose` in `src/lib/signed-value.ts`, sign with `signValue`, read with `readSignedValue`, and check the payload's fields with a Zod schema, as `readStaffSessionCookie` does.
