# Step 60.4: A school's privacy notice

> **Approved and built 2026-11-26** (a super admin may publish for a busy principal; no in-app draft). Written before the code, 2026-11-24. Under the Data Privacy Act the school decides what it keeps about its students, so it is the school that tells parents, in a privacy notice, in its own words. This step lets a principal write and publish that notice, keeping every published version. Step 60.5 then asks each parent to accept it. This step has data risk (a migration, and text that parents will consent to), so the systems-architect reviews it before you approve (see "Architect review" at the end).

## Why

Split from "Privacy notice and consent" on 2026-11-24. A parent account belongs to no school when it is made, so consent can only be given per school, when a parent links a child there (60.5). Before that can happen, each school needs a notice to accept. That is this step:

```
Settings (principal, or a super admin with a school open)
   ...
   Privacy notice                              Version 2, published 24 Nov 2026
   [ the school's own wording, plain text, paragraphs                        ]
   [                                                                         ]
   [Publish as version 3]  -> "Every linked parent will be asked to accept it again." -> [Publish]
   Earlier versions: version 1, 12 Nov 2026
```

Nothing a parent sees changes in this step.

## What it costs

No service, package or env variable. One small table: a row per published version, at most 20,000 characters (about 20 KB) each. A school publishes a handful of versions in its life. The Settings page adds one indexed read (the newest version's text, and the versions' numbers and dates). Nothing grows with students, taps or days.

## Decisions

| Decided | Why |
|---|---|
| A published version is **never edited or deleted** (until the whole school is deleted, 60.6). Publishing again adds version N+1. | 60.5 records which version a parent accepted. The exact text they accepted must still exist to show them. |
| **No drafts.** The text box holds the work until "Publish". | A draft table, and "draft vs published" states, for a text written once or twice a year. The form keeps its text if publishing fails. |
| **Plain text only.** Paragraphs are separated by a blank line; no Markdown, HTML or links. Shown with React's normal escaping, `whitespace-pre-wrap` and `break-words`, so spacing pasted from Word shows as stored. | Nothing to sanitize, nothing that can run in a parent's browser. A principal can paste from a Word document. |
| **200 to 20,000 characters**, after trimming. Line endings (`\r\n` and a lone `\r`) normalized to `\n`. The database checks it too: `version >= 1` and `char_length(body) <= 20000`. | Too short is almost certainly a mistake (a test, "TBA"), and each version will ask every parent again in 60.5. 20,000 is about eight printed pages. |
| **The same text as the current version is refused.** | It would ask every parent again for nothing. |
| **Two people publishing at once:** the form sends the version it was editing (`basedOnVersion`). The new row is `basedOnVersion + 1`, and the unique `(schoolId, version)` refuses the second. | No lock, no silent overwrite. The second person is told "Someone published version N while you were editing. Reload to see it." Their text stays in the box. |
| **Who published is in the Activity log**, not on the notice row. That event is **written in the same transaction as the notice** (architect review). | The log already holds the staff id and role (Step 60.1). One place, and the notice row holds nothing about a person. `recordAudit` is best-effort and can drop an event, so like removing a parent and deleting a student, this event is written with the change or not at all. The log keeps events for two years (`AUDIT_RETENTION_MS`), so "who published version 1" is forgotten after that; the notice text itself is kept until the school is deleted. |
| **A super admin can publish for a busy principal** (the owner's question, 2026-11-26). The draft and the principal's approval happen outside the app; the super admin opens the school and publishes the approved text. | It needs nothing extra: a super admin with a school open already has that school's Settings. The Activity log shows "Super admin published a new privacy notice". The principal's written "yes" stays with the school as proof the wording is theirs. A draft inside the app that the principal publishes themselves was offered and left for later. |
| **Sample wording only in the demo data**, inserted with `createMany({ skipDuplicates: true })` and a comment warning never to run the seed against a live school. | The live site's demo data was loaded once, at the first deploy (`docs/DEPLOY.md`), and is never loaded again. So the real pilot school starts with no notice, and its principal publishes the school's own. If the seed were ever run there again and the pilot school already had its own version 1, `skipDuplicates` would leave it alone instead of failing or adding the sample. The sample starts "Sample notice for the demo. Your school writes its own." |

## The changes

**1. Migration `privacy_notices`.**

```prisma
// A school's privacy notice (Step 60.4), in the school's own words. A
// published version is never changed: publishing again adds the next one,
// so the exact text a parent accepted (Step 60.5) can always be shown.
model PrivacyNotice {
  id          String   @id @default(uuid())
  schoolId    String
  // Cascade: goes with a deleted school (Step 60.6), like its Activity log.
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  version     Int
  // Plain text, paragraphs separated by a blank line. 200 to 20,000 characters.
  body        String
  publishedAt DateTime @default(now())

  // One row per version; also "this school's newest version" (ORDER BY version DESC LIMIT 1).
  @@unique([schoolId, version])
}
```

The migration's SQL gets two hand-written checks after Prisma's output: `CHECK ("version" >= 1)` and `CHECK (char_length("body") <= 20000)`. Prisma can't declare a CHECK, so they live only in the migration, with a comment on the model saying so.

`School` gains `privacyNotices PrivacyNotice[]`. `AuditAction` gains `privacy_notice_published`. It goes in the Activity page's "School" group, and `describe.ts` says "published a new privacy notice". The tests that compare the enum with `AUDIT_ACTIONS` keep the list honest. The comment on `AuditEvent.school` and in `docs/AUDIT-LOG.md` now say 60.6.

**2. `src/features/privacy/` (new).**
- `notice-schema.ts`: `noticeBodySchema` (trim, `\r\n` and `\r` to `\n`, 200 to 20,000 characters, friendly messages) and `publishNoticeSchema` (`{ body, basedOnVersion: int >= 0 }`, 0 meaning "no notice yet"). Shared by the form and the server.
- `types.ts`: `PrivacyNotice` (`{ schoolId, version, body, publishedAt }`) and `NoticeVersion` (`{ version, publishedAt }`).
- `notice-text.tsx`: shows a notice, one `<p>` per paragraph (split on `\n\s*\n`), `whitespace-pre-wrap break-words` inside each paragraph. Reused by 60.5's parent pages.
- `privacy-notice-form.tsx` (client): the text box (`Textarea`, labelled, character count, inline errors), the current version and date, and "Publish as version N". The button opens a confirmation `Dialog`: "Every parent with a child at this school will be asked to read and accept version N before they can use the app again (Step 60.5)." The button is disabled while publishing. A success toast says "Published version N". On "stale", the text stays in the box and the message offers Reload.
- `privacy-actions.ts` ("use server", async exports only, P-070): `publishPrivacyNotice(input)`.
- `privacy-messages.ts`: the messages the form and the action share.

**3. `src/data/repositories/privacy-notice-repository.ts` and `prisma-privacy-notice-repository.ts` (new, Prisma only).**
- `current(schoolId): Promise<PrivacyNotice | null>`: the newest version.
- `versions(schoolId): Promise<NoticeVersion[]>`: `select` only `version` and `publishedAt`, never `body`, newest first. It is capped at 50, which is more than a school will ever publish.
- `publish(schoolId, body, basedOnVersion, actor): Promise<{ ok: true; version: number } | { ok: false; reason: "stale" }>`. In one `$transaction`:
  1. Read the newest version. If it isn't `basedOnVersion`, answer "stale" and write nothing. This also stops a forged `basedOnVersion` ahead of the newest from leaving a gap in the numbers.
  2. Insert version `basedOnVersion + 1`.
  3. Write the `privacy_notice_published` event (actor, target the school, no details).

  A real race gets past step 1 in both transactions; the unique `(schoolId, version)` then fails the second insert with P2002, which aborts that transaction. So P2002 is caught **outside** the `$transaction` and answered as "stale", the same shape as `retryOnce` in `prisma-errors.ts` (`isUniqueViolation` already exists there). Exported from `index.ts`.

**4. `src/services/privacy/publish-notice.ts` (new).** `publishNotice(session, input, deps)`:
- It refuses a teacher, a missing session or a null `schoolId` (a super admin with no school open).
- It parses the input with `publishNoticeSchema`.
- It refuses `same_text` when the body equals the current version's.
- It calls `publish` with `actorOf(session)`; the event is written inside it, not through `recordAudit`.
- It answers `{ ok: true, version } | { ok: false, code: "not_allowed" | "invalid" | "same_text" | "stale", ... }`.

**5. Settings page.** A "Privacy notice" section after "Notifications", rendered only when the school is found. It shows the form with `current` and the `versions` list ("Earlier versions: version 1, 12 Nov 2026"). With no notice yet, it says "Parents can't link a child at this school until you publish a privacy notice (Step 60.5)." The page's existing teacher and no-school guards cover it.

**6. Demo data.** `insertDemoData` creates version 1 for the two demo schools if they have none, with the clearly marked sample text. `npm run db:reset` and Playwright's setup therefore start with a notice.

**7. Docs.**
- `docs/PRIVACY.md` gets a "The school's privacy notice (60.4)" section: what is kept, versions, who can publish (including a super admin for a busy principal), that who published a version is in the Activity log for two years while the text is kept until the school is deleted, and that the wording is the school's and not legal advice.
- `docs/PLAN.md`'s 60.5: its consent row points at `(schoolId, version)` with a composite foreign key to `PrivacyNotice`'s unique pair, with an index on `(schoolId, parentId, version)` (architect review, carried to 60.5's own recipe).
- `docs/AUDIT-LOG.md` gets the new event.
- The build log, the learning log and this recipe's "What was actually built".

## Checks

- Unit:
  - The schema: trim, line endings, too short, too long, and `basedOnVersion` not a whole number.
  - The service:
    - a teacher and a school-less super admin are refused, and nothing is written
    - the same text is refused
    - "stale" is passed through
    - `publish` gets the session's actor, for a principal and for a super admin with the school open
  - The form:
    - the confirmation names the next version
    - the button is disabled while publishing
    - the text is kept on an error
    - "stale" shows Reload
  - `notice-text`: paragraphs are split on blank lines, and HTML is shown as text.
  - The audit readers (the enum list and the describe table).
- Postgres (`prisma-privacy-notice.pg.test.ts`, new):
  - The test makes its own school, by the P-071 rule.
  - Versions go 1, 2, 3.
  - `current` and `versions` return this school's only.
  - A stale `basedOnVersion` answers "stale", and nothing is written.
  - A forged `basedOnVersion` ahead of the newest answers "stale", and leaves no gap.
  - Two publishes from the same `basedOnVersion` at once: exactly one wins, the other is "stale", and there is exactly one event.
  - A version and its event are written together.
  - The database refuses a version of 0 and a body over 20,000 characters (the CHECKs).
  - Another school's notices are untouched.
  - `EXPLAIN` of "the newest version" uses the unique index (in the build log).
- Browser (`e2e/privacy-notice.spec.ts`, new):
  - A principal publishes the next version and sees it with today's date.
  - Activity shows "published a new privacy notice".
  - Publishing the same text is refused.
  - A teacher sees no Privacy notice section (Settings is closed to them).

Run the usual routine (`docs/LEARNING-LOG.md`), after migrating the test database and restarting `npm run dev`, then:

```bash
npx vitest run src/features/privacy src/services/privacy src/data/repositories src/features/audit
npx playwright test e2e/privacy-notice.spec.ts
```

Then look at Settings → Privacy notice at 360px and 1280px, in light and dark.

## Dead ends considered

- *A `privacyNotice` text column on `School`:* there would be no versions, so 60.5 couldn't show a parent the text they accepted.
- *Markdown or rich text:* it needs a parser and sanitizing, and gives one more way for a page to break. Plain paragraphs are enough for a notice.
- *Locking the school row to number versions:* the unique constraint and `basedOnVersion` already prevent a lost update, without a lock.
- *A "minor edit, don't ask parents again" option:* the stored text would no longer be what parents accepted. A typo fix is a new version.

## Architect review

*Review of this recipe, 2026-11-24: sound, approvable after one blocking fix, now made above.*
- **Blocking:** the Activity log was the only record of who published a version, but `recordAudit` can drop an event. The event is now written inside `publish`'s transaction, and P2002 is caught outside it. `docs/PRIVACY.md` will say that event lasts two years and the text until the school is deleted.
- **Also adopted:**
  - the `basedOnVersion` check is also what stops a forged version from leaving a gap, with a test for it
  - `pre-wrap` and `break-words` instead of `pre-line`, and a lone `\r` normalized
  - the database CHECKs on version and length
  - `createMany({ skipDuplicates })` and a warning comment in the demo data
  - `versions()` never selects the text
- **For 60.5:** consent points at `(schoolId, version)` through a composite foreign key, so its school always matches the notice's, and "who has an older version" is a number comparison. Add an index on `(schoolId, parentId, version)`.
- **Confirmed fine:** the race can only make one version N+1; the school comes from the session only; Cascade matches the Activity log for 60.6; reading the newest version is one index read. Nothing in 60.4 forces a second migration in 60.5.

The owner's question of 2026-11-26 (a super admin publishing for a busy principal) needed no design change, so it was not reviewed again.

## What was actually built

As written, with these differences:
- **Migration `20261126122452_privacy_notices`.** The two CHECKs are named `PrivacyNotice_version_positive` and `PrivacyNotice_body_length`, so a refusal names the rule.
- **The demo data has three schools.** Balanga and Oceanview get the sample; Crimson Ridge is left without a notice on purpose, for 60.5's "no notice yet". The sample doesn't claim a retention period, since the app has none for attendance.
- **The service checks for a stale form before the same-text check**, so a form left open on an old version is told to reload, not that its text matches. The repository checks again inside its transaction.
- **The Settings section** sits after Notifications. With no notice yet it says "Not published yet. Parents can't link a child at this school until you publish one." (true from 60.5). The confirmation names `PRODUCT_NAME`.
- **The browser test** uses Balanga's principal at phone width and Oceanview's on desktop, so the two runs never publish over each other.
- **The Postgres test** makes its own two schools (`pnt-…`) and deletes them afterwards, which takes their notices and events with them. Its `EXPLAIN` runs with `SET LOCAL enable_seqscan = off` inside one transaction.
- **Files:**
  - `prisma/schema.prisma` and the migration
  - `src/features/privacy/` (`types.ts`, `notice-schema.ts`, `notice-text.tsx`, `privacy-messages.ts`, `privacy-actions.ts`, `privacy-notice-form.tsx`, each with a test except the types and messages)
  - `src/data/repositories/privacy-notice-repository.ts`, `prisma-privacy-notice-repository.ts`, `prisma-privacy-notice.pg.test.ts`, and `index.ts`
  - `src/services/privacy/publish-notice.ts` and its test
  - `src/app/(app)/settings/page.tsx`
  - `src/features/audit/` (`types.ts`, `describe.ts`, `groups.ts`)
  - `prisma/demo-data.ts`
  - `e2e/privacy-notice.spec.ts`, added to `test:e2e` in `package.json`
