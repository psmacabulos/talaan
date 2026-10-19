# Product rules

What a parent sees, and why. The same words and rules as Talaan's web app, so parents and school staff always see the same thing. The API contract is `docs/TALAAN-API.md`; this file is how to show what it answers.

## What the server decides (the app never works these out)

- **Time in or time out.** The 1st tap of the day is time in, the 2nd time out, the 3rd time in again, and so on. The server works it out from the day's taps; the app shows the `kind` and `status` it's given.
- **Duplicate reads.** The same card read again within 2 minutes is one pass through the gate, and is ignored.
- **Late and absent.** Each school sets its own times. On weekends there's no late or absent.
- **Who gets notified.** Each school's principal sets one setting for every parent at that school: off, time in only, or time in and time out (`child.school.notificationPreference`). Parents can't change it. Show it on the child's card, for example "Your school sends: time in and time out".
- **What a parent may see.** Only their own linked children. The server enforces it, so the app never filters anything itself.
- **Read marks are shared** by a child's guardians: when one parent reads a notification, it's read for the other too.
- **The tap's time is what matters.** It's saved the moment the card is read. A push may arrive a few minutes late, and always says the real tap time.

## The words to use

| `status` | Weekday | Weekend (`flexible: true`) |
|---|---|---|
| `present` | Present | Came in |
| `late` | Late | (can't happen) |
| `absent` | Absent | (can't happen) |
| `idle` | Not yet tapped | No tap |

- A feed entry reads "**{childName} tapped in** at 7:56 AM", or "tapped out". A push uses the child's first name only: "Juan tapped in at 7:56 AM".
- Grade and section read "Grade 7 – Rizal", with an en dash.
- When `tapCount` is more than 2, show "N taps today", with the full list from the taps address. A child can leave and come back.
- With children at two schools, show each child's school name on their card.
- The unread count stops at 10 on the server: show "9+" from 10.
- Never "Absent" on a weekend. Holidays and class suspensions aren't handled yet (Talaan Step 63).

## Times and dates

- Every time is an ISO string with the school's offset: `2026-10-13T07:56:00.000+08:00`. Every date is `YYYY-MM-DD` on the school's calendar.
- **Show times on the school's clock (UTC+8, Philippine time), whatever the phone's time zone.** Don't rely on `Intl` time zones or `toLocale…` (they use the phone's zone, and support varies between phones). Add 8 hours to the UTC instant and read the UTC fields, as `reference/school-time.ts` does. Put it in one helper file, with tests.
- Format times like "7:56 AM", and dates like "Monday, October 13", with weekday and month names from the app's own strings.
- "Today" is the school's date, not the phone's. Use `child.today.date` from the server.
- Birth dates are typed by the parent once, when linking, and never shown back.

## Form field rules

The same rules and messages as the server's own checks (Talaan's `src/features/parents/auth-schemas.ts`, checked 2026-10-19). The server checks again; show its `fields` messages under their field when it does.

| Field | Rule | Message |
|---|---|---|
| First and last name | not empty, trimmed | "Enter a first name", "Enter a last name" |
| Mobile | `09XXXXXXXXX` or `+639XXXXXXXXX` | "Enter a valid PH mobile number, e.g. 09171234567" |
| Email | a valid email, trimmed and lowercased, at most 254 characters | "Enter a valid email address" |
| Password (sign-up) | 8 to 128 characters | "Use at least 8 characters", "Use 128 characters or fewer" |
| Confirm password | the same as the password (the app checks it; the API has no `confirmPassword`) | "Confirm your password", "Passwords don't match" |
| Password (sign-in) | not empty, at most 128 characters | "Enter your password" |
| School, when linking | a picker from `GET /schools` | "Select your child's school" |
| LRN | exactly 12 digits, number keyboard | "LRN must be exactly 12 digits" |
| Child's last name | not empty | "Enter your child's last name" |
| Birth date | a date picker, never typed free-hand, sent as `YYYY-MM-DD` | "Enter your child's birth date" |

## Notifications and push

- A push: title "Bantay Aral", body "Juan tapped in at 7:56 AM", `data: { notificationId, childId }`, Android channel `attendance`.
- **Create the Android channel `attendance` (name "Attendance") before registering the push token.** Android doesn't show a push sent to a channel the phone doesn't have.
- **Ask for permission at a moment that explains itself:** right after the parent links their first child ("Get a notification when Jose taps in or out?"), never on first launch.
- Register the token after sign-in, on every app start, and whenever Expo gives a new one. Sending the same token again is cheap.
- Tapping a push opens the feed at that entry, if it's there. In the foreground, show it in the app, and refresh home and the feed.
- If the school's setting is "off", say so on the child's card rather than letting the parent wonder.

## Signing in

- One token per phone, kept in `expo-secure-store`. It lasts 30 days from its last use. Any request keeps it alive, so call `/me` and register the push token on every app start and every return to the foreground.
- **Any `401` means signed out:** clear the token, the cached data and the cached photos, and show sign-in. After 30 days unused, pushes stop too, so the sign-in screen says "Sign in again to keep getting notifications".
- No "Forgot password?" link until Talaan's Step 55.5: never a link that leads nowhere, and never "ask the school".

## Privacy

- The API never sends the LRN, the birth date, the guardian's details, the card serial, or anything about other students. The app never asks for a card number.
- Cards hold only an ID. Everything else lives in the backend's database.
- Photos are 4:5 portraits (256 × 320, WebP or JPEG), loaded with the parent's token. Show them in a 4:5 box, never stretched or cropped differently. Cache by path: a new photo always gets a new path.

## Facts about the backend worth knowing

- **Roles** in the backend: super admin, principal, teacher, parent. This app is only ever the parent.
- **Every school is separate.** A parent sees only their own linked children.
- **A parent can have several children, at one school or several, and a child several parents.** Each parent links each child once.
- **The gate keeps working without the app.** A parent who never installs it still has the web parent portal (`/parent` on the same server), and the school keeps the guardian's mobile number on file.
- **Not in the API yet:** forgot password (Talaan Step 55.5), deleting your own account (Step 60), per-school colours (later), per-parent read marks (only if wanted).
