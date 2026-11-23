# Privacy: what is kept, and what can be deleted

Step 60 answers the question a school will ask under the Data Privacy Act: "what do you keep about my child, and can you delete it?" This page grows as its parts are built. It is the technical record, not legal advice; the wording of a privacy notice comes from the school (Step 60.4). The activity log is in `docs/AUDIT-LOG.md`.

| Part | Step | State |
|---|---|---|
| The activity log of who changed what | 60.1 | built |
| A parent deletes their own account | 60.2 | built (below) |
| Export and delete one student | 60.3 | not built |
| Privacy notice and consent | 60.4 | not built |
| Export and delete a whole school | 60.5 | not built |

## A parent deletes their own account (Step 60.2)

From **Account** in the parent portal, or `DELETE /api/v1/parents/me` in the app (`docs/PARENT-API.md`), with the account's password. The password is checked by the same code and limits as sign-in, against the account's own email from the database.

```mermaid
flowchart TB
    P["Parent confirms with the password"] --> T["One database transaction"]
    T --> L1["lock the parent's row"]
    L1 --> L2["write one 'parent_account_deleted' event per linked child (no actor, no parent id)"]
    L2 --> L3["delete their links to children"]
    L3 --> L4["delete the parent"]
    L4 --> C["cascade: sign-ins, push addresses, waiting pushes,<br/>reset codes, school blocks, notices addressed to them"]
```

| Goes | Stays |
|---|---|
| the account, and its email (free to sign up with again) | the children's records, taps and shared notifications: they are the school's |
| every sign-in and every phone's push address, and pushes still waiting to be sent | the other guardians of the same child, and their links |
| password-reset codes, and a block the school put on this parent | the school's own record that it removed them (`parent_link_removed` in Activity) |
| their links to children, and notices addressed to them | other guardians' link notices, which then say "A parent account" instead of a name |

**Not in our power to recall** (say so if asked):
- A push already delivered to a phone. It carries the child's first name and sits in the phone's notification centre, and in Expo's and Apple's or Google's push services for as long as they keep it. A push that was already being sent when the account was deleted can still go out once.
- A password-reset email, which sits in the email provider's logs (the provider keeps its own retention).
- Database backups. A deleted row stays in a backup until the backup expires (Heroku's retention for the plan).
- The in-memory sign-in limit, which remembers a wrong-password count for the email for up to 15 minutes. A restart clears it.

**Never kept:** the activity log holds no parent id and no name for this event, and error reports to Sentry carry no request body (`src/lib/error-reporting.ts`, tested for the delete request).

**The app's part:** on `204` it must clear its stored token, push registration and everything local, and go to sign-in (`docs/PARENT-API.md`, `mobile/starter/docs/PLAN.md` M3).

### Why it is built the way it is

- **The parent's row is locked first.** A link-a-child, a sign-in or a school removing the parent runs at the same moment as a delete in some small fraction of cases; locking first makes them wait, then fail cleanly instead of leaving a half-deleted account. Both this delete and the school's "remove parent" retry once on a deadlock (`isDeadlock`, `retryOnce` in `src/data/repositories/prisma-errors.ts`), and a link that loses the race to the delete is retried once and, if it still can't, answered as "no match".
- **A wrong password is `403 wrong_password`, never `401`.** The app signs out on any `401`.
- **A school's block on a parent goes with the account.** It was per parent id, so it never stopped a new account; linking a child still needs the LRN, last name and birth date, and the log keeps that the school removed them.
- **Accepted:** someone with a stolen session can lock the owner out of signing in with five wrong deletes, as they already can through sign-in. A sign-in in the very instant of its own delete can return an error page once.

## Quick recipes

**See what a deleted parent left in the database:** nothing of theirs, by design. `select * from "AuditEvent" where action = 'parent_account_deleted'` shows only the child's id and the school.

**Delete a parent's account by hand (support):** there is no tool, on purpose: the parent does it themselves with their password. If they've lost it, they reset it first (Step 55.6), then delete.
