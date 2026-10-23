# Build plan

Steps M1 to M8 get to the demo. Work on the first step whose "Owner review" box isn't ticked (`CLAUDE.md`, "One step at a time"). Each step's "Commit:" line is a suggestion; the owner makes the commit.

**The server:** Talaan's live server on Heroku (`https://bantayaral.herokuapp.com`), over HTTPS, deployed through Talaan's Step 54.1. Talaan on the owner's Mac is the fallback (`docs/SERVER.md`).

## The demo (M1 to M8)

### Step M1: Set up the project
- [ ] Expo (latest stable SDK) with Expo Router, TypeScript `strict`, npm, Node 24 (`.nvmrc` and `engines`)
- [ ] ESLint (Expo's config), Prettier, Jest with `jest-expo` and React Native Testing Library; `npm run lint`, `npm run typecheck`, `npm test`
- [ ] GitHub Actions running lint, typecheck and tests on every push, on Node 24
- [ ] The app's name **Bantay Aral** and id **`com.bantayaral.parent`**, in `app.config.ts`; `PRODUCT_NAME` in one file
- [ ] `src/theme`: the colour tokens (light and dark, following the phone), the type scale, space and corners, from the owner's design in `design/` or `docs/DESIGN.md`'s fallbacks
- [ ] Lexend and Atkinson Hyperlegible loaded, the splash screen held until they're ready
- [ ] `src/strings.ts` for every string a parent sees
- [ ] One styled screen (the sign-in screen's look, no sign-in yet) with the Bantay Aral logo drawn from `reference/mark-shapes.ts`
- [ ] `README.md` (what this is, how to start it), `docs/COMMANDS.md`, `.env.example`
Done when: lint, typecheck and tests pass in CI, and the screen looks right on the owner's Android phone, in light and dark.
Commit: `chore: set up the Expo app with the Bantay Aral theme`
- [ ] Owner review: I checked it and said "approved"

### Step M2: The API client
- [ ] The server's address from `EXPO_PUBLIC_API_URL`, never hard-coded
- [ ] Typed requests, every answer checked with Zod, unknown fields ignored
- [ ] One error handler for the error shape in `docs/TALAAN-API.md`, plus "no answer at all" (no internet, server down)
- [ ] The token in `expo-secure-store`; any `401` clears it and everything cached, and goes to sign-in
- [ ] Unit tests with a fake server, covering every error code
Done when: the tests cover every error code, and `GET /schools` works from the phone against the live server.
Commit: `feat(api): add the API client with one error handler`
- [ ] Owner review: I checked it and said "approved"

### Step M3: Sign up, sign in, sign out
- [ ] Sign-up (first and last name, mobile, email, password twice) and sign-in, with the field rules in `docs/PRODUCT-RULES.md`
- [ ] A `409` on sign-up offers "Sign in instead"; `wrong_credentials` keeps the email; `too_many_tries` keeps the form usable
- [ ] `deviceLabel` from the phone's model
- [ ] Sign out calls `POST /logout`, then clears everything locally
- [ ] `/me` called on every app start and every return to the foreground
- [ ] No "Forgot password?" link yet: the server has it (Talaan Step 55.6), but the screens are their own step after the demo (below)
Done when: a new parent can sign up, sign out and sign in again, and a sign-in survives closing the app.
Commit: `feat(auth): add sign up, sign in and sign out`
- [ ] Owner review: I checked it and said "approved"

### Step M4: Link a child
- [ ] The school from `GET /schools`, the LRN (12 digits, number keyboard), last name, and birth date from a date picker
- [ ] `404` ("no match"), `409` ("already linked") and `429` ("too many tries", Talaan Step 55.1) all shown clearly
- [ ] After linking, the new child appears at once (the answer is a `ChildToday`)
Done when: linking the demo student works, and a wrong birth date and a second link both say so clearly.
Commit: `feat(children): link a child with their LRN and birth date`
- [ ] Owner review: I checked it and said "approved"

### Step M5: Home
- [ ] Each child's card for today: photo (4:5), name, school, "Grade 7 – Rizal", the status pill, time in and time out, and "N taps today" when there are more than 2
- [ ] The weekend words when `flexible` is true
- [ ] Pull to refresh; skeletons while loading; the empty state says how to link a child; the error state offers "Try again"
- [ ] The child's school's notification setting shown on the card
Done when: a child who tapped at the gate shows as present, with the time.
Commit: `feat(home): show each child's day`
- [ ] Owner review: I checked it and said "approved"

### Step M6: The feed and a child's day
- [ ] Notifications newest first, more as the parent scrolls (`nextBefore`), pull to refresh
- [ ] The unread badge on the feed's tab ("9+" from 10)
- [ ] Opening one marks it read; "Mark all as read"
- [ ] A child's day: every tap, from the taps address
Done when: the feed matches the web parent portal's bell for the same parent.
Commit: `feat(feed): add the notification feed and a child's day`
- [ ] Owner review: I checked it and said "approved"

### Step M7: Push
- [ ] The owner's free Expo account and EAS project id, and a free Firebase project with an Android app `com.bantayaral.parent`: give the owner the exact clicks
- [ ] A development build installed on the phone (Expo Go can't receive push on Android)
- [ ] The Android channel `attendance` ("Attendance") created before the token is registered
- [ ] Permission asked right after the first child is linked, never on first launch
- [ ] The Expo push token registered after sign-in, on every app start, and whenever it changes
- [ ] In the foreground: shown in the app, home and feed refreshed. Tapping a push opens the feed at that notification
- [ ] The live server switched to send for real: `PUSH_SENDER=expo` and `EXPO_ACCESS_TOKEN`, set by the owner on Heroku (`docs/SERVER.md`, "Testing a real push")
Done when: a tap at `/gate` for a linked child buzzes the phone, with the app closed.
Commit: `feat(push): get a push when a child taps in or out`
- [ ] Owner review: I checked it and said "approved"

### Step M8: The demo build
- [ ] Check with the owner that Heroku runs Talaan's latest approved step, with `PUSH_SENDER=expo`
- [ ] The app icon and splash screen from the logo, on white, with the name Bantay Aral
- [ ] An installable Android build pointing at the live server over HTTPS
- [ ] The demo script below in `docs/DEMO.md`, run from start to finish
Done when: the owner runs the demo script on a real phone without help.
Commit: `chore(release): add the demo build`
- [ ] Owner review: I checked it and said "approved"

## The demo script

**Before:** Talaan is live on Heroku, sending pushes (`PUSH_SENDER=expo`), with the gate tablet connected. One of the owner's NFC stickers is linked to the demo student Jose Pascual (web app: Students → Jose Pascual → Card serial). Balanga's notification setting (Settings) isn't "Off".

1. Install the demo build on an Android phone.
2. Sign up as a new parent. Or sign in as the demo parent `parent-one@balanga.example`, password `Talaan123!` (the demo password keeps the code name).
3. Link a child: school **Balanga City National Science High School**, LRN **100000000002**, last name **Pascual**, birth date **2014-03-03** (Talaan's demo data, checked 2026-10-19; if it has changed, ask the owner).
4. Allow notifications.
5. Tap Jose's sticker at the gate. The phone shows "Jose tapped in at …". A push may take a few minutes when the server is busy: the time it shows is always the real tap time.
6. Open the app. Home shows Jose present, with his time in. The feed shows the notification. Open it, and it's read.
7. Tap again after 2 minutes: "Jose tapped out at …".

## After the demo

Each becomes its own step when it's due:
- **Forgot password, from the app.** The server is ready (Talaan Step 55.6, `docs/TALAAN-API.md`, "`POST /password-reset`"). Parents recover their own password, never by asking the school. Two screens:
  1. **Email** → `POST /password-reset`. Show the same answer for every `202`, whatever the email.
  2. **Code and new password** → `POST /password-reset/confirm`. Keep only the email between the two screens, in the screen's state (not SecureStore). The code field: number pad, `textContentType="oneTimeCode"` and `autoComplete="one-time-code"`; trim it and check it's 6 digits. "Send a new code" waits 30 seconds after each send. A `200` is a sign-in: store the token as login does, then register the push address again (the reset removed it). `400 invalid_code` keeps what was typed; `503 unavailable` shows its message.
- **Deleting your own account,** with Talaan's Step 60. Both app stores require it before publishing an app that makes accounts.
- **iOS,** once the owner decides on the Apple Developer account.
- **Publishing to Google Play:** a privacy policy page (for example on `bantayaral.com`) and the store listing.
- Per-school colours, the last data shown while offline, and a Filipino translation.
