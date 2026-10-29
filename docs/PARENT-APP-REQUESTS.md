# Requests from the parent app

The Expo parent app (`talaan_parents_app`) writes down what it needs from this server in its own `docs/API-REQUESTS.md`. The owner brings each request here, it's decided, and the ones taken become steps in `docs/PLAN.md`. This file keeps the decisions, so both repositories can see what was agreed and why.

When a request is built, `docs/PARENT-API.md` (the contract, copied into the app as `docs/TALAAN-API.md`) changes with it. This file only says what was decided.

## Decisions

| # | Request | Decision | Date | Step |
|---|---|---|---|---|
| 1 | A new attendance `status` would hide a child | **Taken, as a promise.** The values of `status`, a tap's `kind` and `notificationPreference` never change in `/api/v1`. A new value means `/api/v2`. No `statusLabel` field | 2026-10-28 | 59.6 (built, not yet deployed) |
| 2 | "Seen" separate from "read" | **Taken.** A per-parent "seen" time; the badge counts what's newer than it *and* still unread. `read` stays shared by a child's guardians | 2026-10-28 | 59.7 |
| 3 | A way to contact the school | **Replaced** (owner). No school contact details. A **Report** button on a new-guardian notice emails the super admin instead, and the removed parent's message stops saying "Contact your child's school." | 2026-10-28 | 59.8 |
| 4 | Filter the feed by child and by unread | **Dropped for now.** Once the list is today only (below), it's short enough not to need filters | 2026-10-28 | — |
| 5 | A push without the title "Bantay Aral" | **Taken.** No title on any push; body, data, sound, channel and priority stay the same. Replaced by request 8 the next day | 2026-10-28 | 59.6 (deployed) |
| 8 | The child's first name as the push title (folded pushes showed "null" with no title, P-061) | **Taken.** Title the first name, body the rest: "Juan" / "Tapped in at 7:56 AM"; a link notice "A new parent account was linked". Replaces request 5's "no title" | 2026-10-29 | 59.6 (built, not yet deployed) |
| — | The child's photo in the push | **Not asked for, and agreed.** The phone would load the photo from a link with no sign-in: a minor's face at an open address, shown on a lock screen | 2026-10-28 | — |
| — | The notification list shows today only (owner) | **Taken.** Today's taps on the school's clock, plus any new-guardian notice not yet read, whatever its day. The history moves to a future attendance tab | 2026-10-28 | 59.7 |
| — | An attendance history tab (owner, future) | **Planned.** Needs a request for a range of days, and must wait for the school calendar so holidays never show as absent | 2026-10-28 | 63.1 |

## Why each was decided this way

### 1. Fixed values instead of a fallback label

Old phones aren't updated together. A parent who installed the app in June may still run it in December, and the app drops any child whose `status` it can't read, so a new value would make that child disappear from the home screen with no explanation.

Two ways out were offered: promise the values never change, or send a ready-worded `statusLabel` beside them. The promise costs nothing and was chosen. The contract already said changing a field's meaning needs `/api/v2`; this extends the rule to adding a value.

The one new kind of day already planned, a holiday or class suspension (Step 63), fits without a new value: it reaches the app as `flexible: true`, the same flag a weekend uses, plus a new optional field saying why. An app that doesn't know the new field shows the weekend wording ("No tap" or "Came in"), never "Absent".

A new notification `kind` can still be added. The contract has always said the app must hide a kind it doesn't know, and the app does.

### 2 and the today-only list

The parent wants the badge to go away when they open the bell, but each notification to stay marked unread until they open it. One flag can't do both. Worse, `read` is shared by a child's guardians (Step 55.2), so clearing the badge by marking everything read would clear the other parent's marks too.

So a parent gets their own "seen" time, set when they open the bell. The badge counts notifications newer than that time that are still unread. Counting only "newer than seen" would also count one the parent already opened by tapping its push.

At the same time, the owner wants the list to be **today's only**: the bell says what happened today, and the record of past days belongs in an attendance tab. What the list shows:
- **Today's taps**, on the school's clock, decided by the server, so the badge never counts something the list doesn't show.
- **Any new-guardian notice that's still unread, whatever its day** (owner decision, 2026-10-28). It's a safety warning ("A new parent account was linked to Juan") and must not disappear at midnight.

A time out at 5 PM first seen the next morning is gone from the list by then. That's accepted: the push already reached the phone, and the attendance tab will show it.

`read` stays shared between guardians. Making it per parent would need a row per parent per notification, the only option here that grows storage. It waits until real families ask for it.

### 3. A Report button instead of the school's contact

The app asked for the school's phone and email, so a parent told that a stranger may have linked their child has someone to call. The owner dropped it (2026-10-28): a number only helps if someone at the school answers, and nobody there is set up to. The person who can act is the super admin, who already removes a wrong link and blocks that account (Step 55.4).

So the notice gets a **Report** button instead:
- The advice reads "If you don't know them, tap Report and we'll look into it."
- Reporting sends `POST /api/v1/parents/notifications/:id/report`. Only the parent who received that notice can report it, once; a second report changes nothing. The notice keeps when it was reported (one new column, no new table).
- The super admin gets an email at the address in `REPORTS_EMAIL`, a setting rather than code, so it can go to a school's principal later without a code change.
- The email carries **no names**: only the school's name and a link to its parent accounts page, where the owner looks and removes the link. Email passes through Resend, and students are minors.
- Afterwards the notice reads "Reported. We'll check this link.", so the parent knows it went through.

The same applies to the removed parent's message (`403 link_blocked`): "This child can't be linked to your account. Contact your child's school." loses its second sentence. The removal was deliberate, so there's nobody to send them to.

### 4. Dropped

Filters only matter on a long list. A today-only list for two or three children is a handful of lines.

### The attendance history tab

What the API already has: `GET /api/v1/parents/children/:id/taps?date=YYYY-MM-DD` answers any past day, with its status, the weekend flag and every tap labelled in or out. A "one day in detail" screen works now.

What it still needs:
1. **A request for a range of days** (`GET …/children/:id/attendance?from=&to=`, about a month at most), each day's status, time in, latest tap and tap count, from one database query. Without it a month is 30 requests on mobile data.
2. **The school calendar first (Step 63).** Until then a holiday or typhoon suspension is "Absent" in the history, and a month of false Absents would alarm parents.
3. **Where history starts.** Days before the student was added are "Absent" too. It needs a start: when the student was added, or the school year's start (Step 64).
4. Past days are judged by the school's current late time, so changing it changes old days. Acceptable for now; Step 64's school years are where it would be fixed.

A newly linked guardian sees the child's whole history. They proved the LRN, last name and birth date to link, so this is treated as fine.

## Cost

None of these adds a service, a paid plan or meaningful storage. Expo's push service is free with or without a title. The seen time is one date per parent, written once each time they open the bell. A report is one date on the notice and one email on Resend's free plan, inside the app's own cap of 80 a day shared with password resets; since each notice can be reported once, by its one recipient, reports can't use up the day. The history request reads taps that are already stored, and the today-only list reads fewer rows than the paged list does now.

The today-only list also makes old notification rows unnecessary for parents, so they could later be deleted after a set time instead of kept for years. That's for the "Database storage" item in `docs/PLAN.md` ("When needed") and Step 60's privacy work, not now.

## Open questions

| Question | Where it gets decided |
|---|---|
| Is the "seen" time per parent or per phone? (Per parent is planned: a parent who opens the bell on one phone has seen it) | Step 59.7's recipe |
| How long old notification rows are kept once the list is today only | Step 60 or the "Database storage" item |
| How the attendance tab shows a day before the student was added | Step 63.1's recipe |
| Who gets a report once there are several schools: still the super admin, or that school's principal | When a second school joins (`REPORTS_EMAIL` makes it a setting change) |
| Whether a report shows on the school's parent accounts page too, not only in the email | Step 59.8's recipe |
