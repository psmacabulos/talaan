# The Bantay Aral parent app: a brief for its own repository

The parent app is a separate Expo (React Native) project in its own repository. It talks to this repository's API. This file is everything that project needs to start, so nothing has to be explained again: what the product is, the parent API, the design system, the app's own step plan, and the working rules. It lives here, next to the API it describes, so the two change together.

## For the owner: how to use this file

1. **Create the repository** on GitHub, for example `bantayaral-parent-app`, and clone it. Its first step (M1, the setup) can start any time. The steps after it need Talaan's parent API (Steps 53.3 and 53.4) live on Heroku.
2. **Copy everything from "Start of the brief" to the end of this file** into the new repository as `CLAUDE.md`.
3. **Copy Talaan's `docs/PARENT-API.md`** (written in Step 53.4) into the new repository as `docs/TALAAN-API.md`. Copy it again whenever the API changes. It's the contract, and it wins over the summary below.
4. **Paste this as the first message** in the new repository:

   ```text
   Read CLAUDE.md, and docs/TALAAN-API.md if it's there. This is the Bantay Aral parent app, a new repository with no code yet. Start with step M1 of the plan in CLAUDE.md: plan first, tell me what you'll create and which packages you want to add with what each costs, and wait for my approval.
   ```

5. **Before M7 (push),** you'll need a free Expo account and a free Firebase project with an Android app registered as `com.bantayaral.parent`. The app's M7 step gives you the exact clicks.
6. **When this repository changes** (the API, the design tokens, a decision below), update this file here too, so the next copy is current.

---

<!-- Start of the brief: copy from here to the end into the new repository's CLAUDE.md -->

# Bantay Aral parent app

The parent companion to **Bantay Aral** (`bantayaral.com`), a school attendance system for Philippine high schools. Students tap an NFC ID card at the school gate. Bantay Aral records it and notifies the student's parents. This app is how parents get those notifications: they sign up, link their children, see today's taps, and receive a push notification when a child arrives at school or leaves.

**First pilot:** Balanga City National Science High School, about 500 students. Budgets are small, so the app must be cheap to run and simple to support.

**Two names, on purpose.** "Bantay Aral" is the product's name: everything a parent sees says Bantay Aral. "Talaan" is the code name of the backend. You'll see it in its repository, in this brief when it means the backend, and in the code, for example the sign-in token's `tal_par_` prefix. Never show "Talaan" to a parent.

**The backend is not in this repository.** Talaan, a Next.js app (the owner's `talaan` repository, deployed on Heroku), is the only backend for every client: the staff web app, the gate tablet, the guardhouse monitor, and this app. This app holds no business rules of its own. It shows what the API answers.

## The first goal: a working demo, as fast as possible

The owner wants a demo where both apps work together:
1. a parent registers in this app, or signs in;
2. links their child with the child's school, LRN, last name and birth date;
3. the child taps their card at the gate;
4. **the parent's phone gets a push notification within seconds** ("Jose Pascual tapped in at 7:56 AM");
5. the app shows the child's day, and the notification in a feed.

Steps M1–M8 below get there. Everything else waits until after the demo, and is listed so it isn't forgotten.

## Scope and identity

- **Parents only, always.** Sign up or sign in, link children, today's attendance per child, notifications, push. No staff, gate or admin features, ever: those stay in the web app.
- **One account, any number of schools.** A parent can have children at different Bantay Aral schools, so the account isn't tied to a school. Each linked child carries its own school.
- **Students are minors.** Collect and keep the minimum (see "Privacy and security").
- **Android first.** iOS push needs Apple's Developer Program, about US$99 a year, so iOS waits for the owner's decision. Build nothing Android-only, so iOS later is a build, not a rewrite.
- **The app's identity, set in M1 and never changed:**
  - its name on the phone and in notifications: **Bantay Aral**;
  - the Android package and iOS bundle id: **`com.bantayaral.parent`**. It becomes permanent once the app is published, and the Firebase setup for push is registered with it.

## The parent API

### Where the contract lives

`docs/TALAAN-API.md` is a copy of Talaan's `docs/PARENT-API.md`, and it's the source of truth. The summary below matches it as of 2026-10-16 (Talaan Step 53.4), in brief. **When the two differ, `docs/TALAAN-API.md` wins.** If it's missing, or looks older than the server, ask the owner for a fresh copy. Never guess an endpoint.

**When the app needs something the API doesn't have,** don't work around it in the app, and never call anything outside `/api/v1/parents/*` and `/api/v1/photos/*`. Write the request in `docs/API-REQUESTS.md`: what's needed, the shape you'd like, and why. The owner takes it to the Talaan repository, where it becomes a step there.

### Configuration

- The server's address comes from `EXPO_PUBLIC_API_URL` (for example `https://bantayaral.herokuapp.com`, or whatever the owner named the Heroku app), never hard-coded. `.env.example` shows the shape. The owner keeps the real `.env`.
- Develop against the deployed Heroku server, over HTTPS. A local backend (`http://<the Mac's address>:3000`) also works for development, but Android blocks plain `http` in release builds.
- Every request and answer is JSON. Validate every answer with Zod before using it, and ignore fields you don't know, so a new field from the server never breaks the app.

### Signing in

- Sign-up and sign-in answer with a **token** starting `tal_par_`. Keep it in `expo-secure-store` and nowhere else (never AsyncStorage, never logs).
- Send it on every request as `Authorization: Bearer <token>`.
- A token lasts **30 days from its last use** (Talaan decision, 2026-10-19). Any request keeps it alive, so **call `/me` and register the push token every time the app opens and every time it comes back to the foreground** (this is the only thing that keeps a sign-in, and its pushes, alive): a parent who opens the app at least once a month never signs in again. After 30 days unused, the sign-in is cleared and pushes stop until the parent signs in again; say so plainly on the sign-in screen ("Sign in again to keep getting notifications").
- **Any `401` means signed out.** Clear the token and everything cached, and go to the sign-in screen.
- Sign out calls `POST /api/v1/parents/logout`, which revokes the token and removes the phone's push token, then clears everything locally.

### The addresses

| Method and address | Signed in | Body or query | Answer |
|---|---|---|---|
| `GET /api/v1/parents/schools` | no | | `{ schools: [{ id, name }] }`, for the school picker when linking a child |
| `POST /api/v1/parents/signup` | no | `{ firstName, lastName, mobile, email, password, deviceLabel? }` | `201 { token, parent }` |
| `POST /api/v1/parents/login` | no | `{ email, password, deviceLabel? }` | `200 { token, parent }` |
| `POST /api/v1/parents/logout` | yes | | `204` |
| `GET /api/v1/parents/me` | yes | | `{ parent, children: [ChildToday] }` |
| `POST /api/v1/parents/children` | yes | `{ schoolId, lrn, lastName, birthDate }` | `201 { child: ChildToday }` |
| `GET /api/v1/parents/children/:id/taps?date=YYYY-MM-DD` | yes | | `{ date, status, flexible, taps: [{ at, kind }] }`, or `404` for a child who isn't theirs |
| `GET /api/v1/parents/notifications?before=<cursor>&limit=30` | yes | | `{ notifications: [Item], unreadCount, nextBefore }` |
| `POST /api/v1/parents/notifications/:id/read` | yes | | `204` |
| `POST /api/v1/parents/notifications/read-all` | yes | | `204` |
| `POST /api/v1/parents/push-tokens` | yes | `{ token, platform }` (`ios`, `android`) | `204`. It saves the Expo push token for this signed-in phone (one per phone), or moves it to this parent. |

`deviceLabel` is a name the parent could recognise later, such as the phone's model.

```ts
type ParentJson = { id: string; firstName: string; lastName: string; email: string; mobile: string };

type ChildToday = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number; // 7 to 12
  section: string;
  photo: string | null; // "/api/v1/photos/…", loaded with the same Bearer token
  school: {
    id: string;
    name: string;
    notificationPreference: "off" | "time_in_only" | "time_in_and_time_out";
  };
  today: {
    date: string; // "2026-10-13", on the school's calendar
    status: "present" | "late" | "absent" | "idle"; // idle: no tap yet
    flexible: boolean; // a weekend: no late or absent times
    timeIn: string | null;
    timeOut: string | null;
    tapCount: number;
  };
};

type Item = {
  id: string;
  childId: string;
  childName: string;
  kind: "time_in" | "time_out";
  at: string;
  read: boolean;
};
```

**Paging:** the feed comes 30 at a time, newest first. Pass the last answer's `nextBefore` as `before` for the next page. `nextBefore` is null at the end. It's an opaque string (decided 2026-10-16, Talaan Step 53.2): send it back exactly as received, URL-encoded, and never build or read one. A `before` the server didn't make answers `400`. `limit` is kept between 1 and 50. `unreadCount` counts across all the children and stops at 10, so show "9+" from 10.

### Errors

Every error has the same shape, so the app has one error handler:

```json
{ "error": { "code": "invalid_input", "message": "Check the highlighted fields.", "fields": { "email": "Enter a valid email address" } } }
```

| Code | Status | When | What the app does |
|---|---|---|---|
| `invalid_input` | 400 | a field failed the server's checks | show each message under its field |
| `unauthorized` | 401 | no token, or not a working one | sign out, go to sign-in |
| `wrong_credentials` | 401 | wrong email or password | show the message, keep the email |
| `too_many_tries` | 429 | too many tries: 5 wrong passwords for one email in 15 minutes, 30 from one network in 15 minutes, or 100 sign-ups from one network in an hour | show the message; the form stays usable |
| `not_found` | 404 | not theirs, or doesn't exist | "That's no longer available", then refresh |
| `conflict` | 409 | email taken, child already linked | show the message |

Show the server's `message` as it is: it's already plain, friendly English. When there's no answer at all (no internet, server down), say so plainly and offer "Try again".

### Photos

`photo` is a path: put `EXPO_PUBLIC_API_URL` in front of it and send the same `Authorization` header (`expo-image` takes headers on its `source`). A parent's token can load only their own children's photos. Any other photo is `404`. Every photo is a **4:5 portrait, 256 × 320 pixels**, WebP or JPEG. Show it in a 4:5 box, never stretched or cropped differently. A new photo always has a new address, so a photo can be cached for as long as its address stays the same.

### Times and dates

- Every time is an ISO string with the school's offset, for example `2026-10-13T07:56:00+08:00`.
- **Show times on the school's clock (UTC+8, Philippine time), whatever the phone's time zone.** The backend does this without `Intl` time zones: it adds 8 hours to the UTC time and reads the UTC fields (`src/lib/school-time.ts` in the Talaan repository). Copy that approach into one helper file here, since `Intl` time zone support varies between phones.
- Format times like "7:56 AM", and dates like "Monday, October 13".
- Birth dates are plain `YYYY-MM-DD`, typed by the parent once, when linking, and never shown back.

### The words to use

The same words as the web app, so parents and staff see the same thing:

| `status` | Weekday | Weekend (`flexible: true`) |
|---|---|---|
| `present` | Present | Came in |
| `late` | Late | (can't happen) |
| `absent` | Absent | (can't happen) |
| `idle` | Not yet tapped | No tap |

- A notification reads "**{childName} tapped in** at 7:56 AM", or "tapped out".
- Grade and section read "Grade 7 – Rizal", with an en dash.
- When `tapCount` is more than 2, show "N taps today", with the full list from the taps address. A child can leave and come back.
- With children at two schools, show each child's school name on their card.

### What the server decides (the app never works these out itself)

- **Time in or time out.** The 1st tap of the day is time in, the 2nd time out, the 3rd time in again, and so on. The server works this out from the day's taps. The app shows the `kind` and `status` it's given.
- **Duplicate reads.** The same card read again within 2 minutes is one pass through the gate, and is ignored.
- **Late and absent.** Each school sets its own times. On weekends there's no late or absent.
- **Who gets notified.** Each school's principal sets one setting for every parent at that school: off, time in only, or time in and time out (`child.school.notificationPreference`). Parents can't change it. The app can show it on the child's card, for example "Your school sends: time in and time out".
- **Read marks are shared** by a child's guardians: when one parent reads a notification, it's read for the other too.

### What the app never gets, and never asks for

The LRN, birth date, guardian details and other students never come back from the API. The NFC card holds only an ID, never personal data. The app never asks for a card number.

### Not in the API yet (as of 2026-10-13)

| Missing | Until then | Where it's planned |
|---|---|---|
| **Forgot password** | No link at all: never a link that leads nowhere, and never "ask the school" | Talaan Step 55.5: a parent resets it **themselves, from the app**, with a code or link by email (owner decision, 2026-10-13). Then the app gets "Forgot password?". |
| Deleting your own account | not offered | Talaan Step 60. Both app stores require it before publishing an app that creates accounts. |
| Per-school colours | the default theme below | later, through the API |
| Per-parent read marks | shared marks, as above | with the push work, if wanted |

### Decided on 2026-10-13

1. **One parent account covers any number of schools.** The address table above already reflects it: sign-up has no school, linking a child takes `schoolId`, and each child carries its school. Talaan's Step 53 builds it.
2. **Push uses Expo push tokens,** sent through Expo's push service (free). It delivers through Firebase Cloud Messaging on Android and Apple's push service on iOS.
3. **The product is called Bantay Aral.** The code name Talaan stays in code.

## Push notifications

- Talaan's Step 54 sends the pushes, built 2026-10-16. Until the live server sends for real (`PUSH_SENDER=expo`, at the deploy after M7), the app shows new notifications when it's opened, with pull to refresh.
- A push reads title "Bantay Aral", body "Juan tapped in at 7:56 AM" (the child's first name only), with `data: { notificationId, childId }`. Tapping it opens the feed at that notification.
- **Create the Android channel `attendance` before registering the push token.** Android doesn't show a push sent to a channel the phone doesn't have.
- Use `expo-notifications`, and register with `getExpoPushTokenAsync`, which needs the project's EAS project id (free). **Push needs a development build, not Expo Go** (Expo Go can't receive push on Android). Read Expo's current push setup guide when you reach M7, since it changes between SDK versions.
- **Android needs a Firebase project** (free), so Expo's service can deliver through Firebase Cloud Messaging. That means the app's `google-services.json`, and the FCM key uploaded to Expo's credentials. The owner creates these. Give them the exact steps.
- **Ask for permission at a moment that explains itself:** right after the parent links their first child ("Get a notification when Jose taps in or out?"), not on first launch.
- Register the token with `POST /api/v1/parents/push-tokens` after sign-in, whenever it changes, and on each app start. It's cheap, and the server keeps one row per phone.
- On Android, the notification channel has the id `attendance` and the name "Attendance", so the notification makes a sound and shows on the lock screen.
- Tapping a notification opens the feed, scrolled to that entry if it's there.
- In the foreground, show it in the app, and refresh the home screen and the feed.

## The stack (a proposal for M1: ask before adding anything else)

- **Expo**, latest stable SDK, with **Expo Router** (file-based screens), **TypeScript** with `strict`, and **npm**. Node 24, the same as the backend.
- **TanStack Query** for server data (caching, pull to refresh, retries), **Zod** for checking answers, and **React Hook Form** with Zod for forms. The web app uses the same Zod and React Hook Form.
- `expo-secure-store` for the token, `expo-notifications` for push, `expo-image` for photos.
- Fonts through `expo-font`: **Lexend** for headings and numbers, **Atkinson Hyperlegible** for body text, the same as the web app (`@expo-google-fonts/lexend`, `@expo-google-fonts/atkinson-hyperlegible`).
- **Tests:** Jest with the `jest-expo` preset and React Native Testing Library. ESLint (Expo's config) and Prettier. GitHub Actions running lint, typecheck and tests on every push.
- **Builds:** EAS Build, which has a free plan with a monthly build allowance (check the current limit), or a local build with Android Studio, which is free. Publishing on Google Play is a one-time fee of about US$25, and isn't needed for the demo: the demo installs a build directly.

Every dependency is approved by the owner first. Say what anything costs before adding it. After any generator (`create-expo-app`, `npx expo install`, `eas init`), check every file it touched.

## Design system

**Colours are tokens, never literals in components.** One file (`src/theme/tokens.ts`) holds them, with light and dark values. Components use token names only. These are the web app's default theme, converted on 2026-10-13 from the Talaan repository's `src/styles/tokens.css` (OKLCH) to hex. If those tokens change, convert them again.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` | `#F4F7FB` | `#0D1526` | screen background |
| `foreground` | `#12213F` | `#E9EFFA` | main text |
| `card` | `#FFFFFF` | `#141F36` | cards and sheets |
| `primary` | `#223060` | `#60A0C0` | main buttons, the brand |
| `primaryForeground` | `#FFFFFF` | `#08111F` | text on `primary` |
| `link` | `#1B77A5` | `#82B4CE` | links |
| `highlight` | `#F9E322` | `#F9E322` | the brand's yellow, used sparingly |
| `muted` | `#E8EEF6` | `#1E2B45` | quiet surfaces |
| `mutedForeground` | `#5B6B84` | `#9BABC6` | secondary text |
| `border` | `#DFE6F0` | `#243250` | dividers, card edges |
| `destructive` | `#B92A32` | `#FF8B91` | sign out, delete |

**Brand colours are fixed too** (the logo, the sign-in screen). They're the same in every theme, so Bantay Aral looks the same at every school:

| Token | Light | Dark | Used for |
|---|---|---|---|
| `brandParentTop` | `#2F80D0` | `#FFFFFF` | the parent's head, the top of the figure |
| `brandParent` | `#1149A6` | `#C9D6EA` | the bottom of the parent figure |
| `brandChild` | `#2FA866` | `#2FA866` | the child, and the right page |
| `brandPageLight` | `#6CC896` | `#6CC896` | the left page |
| `brandPageDeep` | `#126A5C` | `#3FA57A` | the book's lower edge |
| `brandEdge` | `#FFFFFF` | `#0D1526` | the page lines (the background behind the logo) |
| `brandSun` | `#F8B014` | `#F8B014` | the sun's rays |
| `brandInk` | `#0A2552` | `#E9EFFA` | "Bantay" in the wordmark |
| `brandGreenText` | `#1A7F48` | `#4CC98A` | "Aral", and any green text (4.7:1 and 8.7:1, both above 4.5:1) |

The logo's own green (`brandChild`) is too light for text, so text uses `brandGreenText`. Brand green never means "present": that's the status green below.

**Status colours are fixed.** They mean the same in every theme, and are never themed or reused for anything else:

| Status | Text, light | Background, light | Text, dark | Background, dark |
|---|---|---|---|---|
| present, time in (green) | `#157A45` | `#E2F5EA` | `#5EDB98` | `#12382A` |
| late (amber) | `#8A5A00` | `#FFF0C7` | `#FFD166` | `#3A2E10` |
| absent (red) | `#B92A32` | `#FDE6E7` | `#FF8B91` | `#40191C` |
| not yet tapped (grey) | `#52627C` | `#E8EEF6` | `#A9B7CE` | `#1E2B45` |
| time out (blue) | `#2058D4` | `#E7F2FF` | `#88BCFF` | `#182B4F` |

A status is shown as a pill: its text colour on its background colour, with the words from "The words to use". Colour never carries meaning alone: the words are always there too.

**Everything else:**
- **Type:** Lexend for headings and every number and time, Atkinson Hyperlegible for everything else. One type scale in `src/theme`: 12, 14, 16, 18, 22 and 28. Never a one-off size. Respect the phone's text size setting: never turn font scaling off.
- **Space:** a 4-point scale (4, 8, 12, 16, 20, 24, 32, 40, 48). **Corners:** 6, 8, 10 and 14 (the web's `radius-sm` to `radius-xl`).
- **Touch targets:** at least 44 × 44 points, and 48 on Android.
- **Light and dark** follow the phone's setting.
- **Motion:** short (100–300 ms) and purposeful, and none when the phone asks for reduced motion.
- **The look:** calm and clear, like the web app. White cards on a pale background, the child's photo large, one clear status. The gate's tap card is the reference: photo, name, "Grade 7 – Rizal", a status pill, and the time in large digits.
- **The name and logo:** "Bantay Aral" on the sign-in screen, the app icon and the splash screen. The mark exists as clean vector shapes in the Talaan repository's `src/components/brand/mark-shapes.ts` (Step 51.6). Copy that file and draw it with `react-native-svg`, with the brand colors below. The word is "Bantay" plus "Aral" in Lexend Bold, "Aral" in the brand's green, and screen readers hear "Bantay Aral". Generate the app icon and splash screen from the same mark, on white.

## UX quality bar

- **Every screen has loading, empty, error and success states.** Use skeletons while loading. An empty home says how to link a child. An error says what happened and offers "Try again".
- **Forms:** check fields as the parent types (the same rules as the server, below), show errors under their field, disable the button while sending, and never lose what was typed.
- **Field rules,** the same as the web's forms:
  - **LRN:** exactly 12 digits ("LRN must be exactly 12 digits"), with the number keyboard.
  - **Mobile:** `09XXXXXXXXX` or `+639XXXXXXXXX` ("Enter a valid PH mobile number, e.g. 09171234567").
  - **Password:** at least 8 characters, typed twice ("Passwords don't match").
  - **Birth date:** a date picker, never typed free-hand.
  - **School:** a picker from `GET /schools`, when linking a child.
- **Accessibility:** every control has a label and a role, contrast meets WCAG AA (the tokens above do), the screen reader announces a new notification, and nothing depends on colour alone.
- **Words:** plain, friendly English in sentence case. Keep every string in one place (`src/strings.ts`), ready for a Filipino translation later. Don't build translation yet.
- **Pull to refresh** on home and the feed. An unread count badge on the feed's tab.

## Privacy and security

- The token lives only in `expo-secure-store`. Signing out, and any `401`, clear the token, the cached data and the cached photos.
- **No analytics, crash reporting or advertising SDKs** without the owner's approval. Any that's approved never receives names, LRNs or photos.
- Never log personal data (names, emails, LRNs, birth dates, tokens), not even in development logs.
- Photos are shown, never saved to the phone's gallery or shared.
- Only the API's own addresses, over HTTPS in every build that isn't local development.

## The plan: M1 to M8 (the demo)

Keep `docs/PLAN.md` in this repository with these steps, a checkbox per task, and an "Owner review" box per step. Work on the first step that isn't approved.

| Step | What | Done when |
|---|---|---|
| **M1** | Set up: Expo, TypeScript strict, Expo Router, ESLint, Prettier, Jest, GitHub Actions; the app's name and `com.bantayaral.parent`; the tokens, type scale and fonts; one styled screen in light and dark | lint, typecheck and tests pass in CI, and the screen looks right on an Android phone in both modes |
| **M2** | The API client: the base URL, typed requests checked with Zod, the one error handler, the token in secure storage, `401` handling. Unit tests with a fake server. | the tests cover every error code, and `GET /schools` works against Heroku |
| **M3** | Sign up, sign in, sign out. No "Forgot password?" yet (Talaan Step 55.5). | a new parent can sign up, sign out and sign in again |
| **M4** | Link a child: the school, the LRN, last name and birth date | linking works, and "no match" and "already linked" both show clearly |
| **M5** | Home: each child's card for today (photo, name, school, grade and section, status, time in and out, "N taps today"), pull to refresh, the empty state | a child who tapped at the gate shows as present, with the time |
| **M6** | The feed: notifications newest first, more as you scroll, the unread badge, read when opened, "Mark all as read"; a child's day (the taps address) | the feed matches the web portal's bell for the same parent |
| **M7** | Push: a development build, the permission ask after linking, the Expo push token registered, the Android channel, the foreground display, tapping to open the feed | with Talaan's Step 54 live, a tap at the gate buzzes the phone |
| **M8** | The demo build: an installable Android build, the app icon and splash screen with the name Bantay Aral, and the demo script below, run from start to finish | the owner runs the demo script on a real phone without help |

**After the demo,** each as its own step:
- **Forgot password, from the app,** once Talaan's Step 55.5 adds it. Parents recover their own password, never by asking the school.
- **Deleting your own account,** with Talaan's Step 60. Both stores require it before publishing.
- **iOS,** once the Apple account exists.
- **Publishing to Google Play:** a privacy policy page (for example on `bantayaral.com`), and the store listing.
- Per-school colours, the last data shown while offline, and a Filipino translation.

## The demo script

**Before:** Talaan's Steps 52–54 are live on Heroku. The gate tablet is connected. One of the owner's NFC stickers is linked to the demo student Jose Pascual, through the web app's Students page → Jose Pascual → Card serial. Balanga's notification setting (Settings) isn't "Off".

1. Install the demo build on an Android phone.
2. Sign up as a new parent. Or sign in as the demo parent `parent-one@balanga.example`, password `Talaan123!` (the demo password keeps the code name).
3. Link a child: school **Balanga City National Science High School**, LRN **100000000002**, last name **Pascual**, birth date **2014-03-03**. This is the backend's demo data; if it has changed, ask the owner for a current example.
4. Allow notifications.
5. Tap Jose's sticker at the gate. Within seconds the phone shows "Jose Pascual tapped in at …".
6. Open the app. Home shows Jose present, with his time in. The feed shows the notification. Open it, and it's read.
7. Tap again after 2 minutes: "Jose Pascual tapped out at …".

## Working rules

These are the same rules the owner uses in the Talaan repository.

**One step at a time:**
1. Read `docs/PLAN.md`, and work on the first step that isn't approved. Never start the next one.
2. Plan first. Say what you'll do, which files you'll create or change, and any new dependency with its cost. Wait for the owner's approval.
3. Build only that step, small enough to review in one sitting. If it grows too big, stop and propose splitting it.
4. The owner runs the checks (`npm run lint`, `npm run typecheck`, `npm test`) and tries the app on their own Android phone. Give them the exact commands, and what to look for on the phone.
5. Tick the finished tasks in `docs/PLAN.md`. Reply with a short review report: what changed in plain language, the files, how to see it working, what's unfinished or uncertain, and a suggested commit message.
6. Stop and wait. When the owner writes "approved", tick that step's "Owner review" box and wait to be asked for the next step.

**Git:** the owner makes every commit. Never run git commands that change anything (add, commit, push, pull, branch, checkout, merge, rebase, reset, stash, tag, remote and the like). Read-only `git status`, `git diff` and `git log` are fine. **No attribution lines anywhere**: no co-author or "generated with" footers in commit messages, and no such notes in docs, code comments or the README. The owner is the sole author of record.

**Secrets:** never read or edit `.env`. When a step needs a new variable, give the owner the exact line to add. Keep `.env.example` current.

**Docs, updated as part of each step:**
- `docs/BUILD-LOG.md`: one section per step. How it was built, the commands run, and every error hit and how it was fixed.
- `docs/LEARNING-LOG.md`: the owner is learning mobile development as this gets built. **Every question the owner asks** gets a short, plain-language entry, organised by topic with a contents list at the top.
- `docs/COMMANDS.md`: every command the owner needs (start the app, run the checks, make a build, install it on the phone), kept current.
- `docs/API-REQUESTS.md`: what the app needs from the backend's API that it doesn't have yet.

**Style:**
- Replies are short and specific. Say plainly when something is uncertain or wasn't tested.
- Small components, named exports, no `any`, no dead or commented-out code.
- If a decision is hard to undo, ask the owner first, with a recommendation.
- **Cheap to run, easy to move:** prefer free tiers, and keep every outside service (push, builds) behind a small module, configured by environment variables.

## Facts about the backend worth knowing

- **Roles** in the backend: super admin, principal, teacher, parent. This app is only ever the parent.
- **Every school is separate.** A parent only ever sees their own linked children. The server enforces it, so the app never filters anything itself.
- **A parent can have several children, at one school or several, and a child several parents.** Each parent links each child once.
- **Cards hold only an ID.** Everything else lives in the backend's database.
- **Weekends:** no late or absent, so the words change (see "The words to use"). Holidays and class suspensions aren't handled yet: Talaan Step 63.
- **The gate keeps working without the parent app.** A parent who never installs it still has the web parent portal (`/parent`), and the school keeps the guardian's mobile number on file.
