# Step 60.3: Export and delete one student

> **Approved and built 2026-11-23** (the student's full name to confirm; audit events about a deleted student kept). Written before the code. The Data Privacy Act gives a student's guardian the right to ask "what do you keep about my child?" and to ask for it to be deleted. Today nothing can answer either: every relation to a student is `onDelete: Restrict`, so a student can't be removed at all. This step has data risk and cost risk, so the systems-architect reviews it before you approve (see "Architect review" at the end).

## Why

A principal needs two things for one student, from that student's drawer on the Students page:
1. **Download their data** as a file, to hand to the guardian.
2. **Delete the student** and everything kept about them, after a deliberate confirmation.

```
Students -> a student -> drawer
   ...
   Privacy
   [Download this student's data]            -> one JSON file (their record, photo, cards, taps, alerts, notices)
   [Delete this student...]  -> "Type Juan Dela Cruz to confirm" -> [Delete]
```

## What it costs

No service, package or env variable. Download: one indexed read per table for one student, once, on request. Delete: one transaction touching that student's rows (a few hundred taps a school year) plus one photo-file delete. Two new `AuditAction` values, nothing else in the schema.

## What is in the download, and what is not

`bantay-aral-<last-name>-<date>.json`, sent with `Cache-Control: no-store`, only to a principal or super admin with that school open:

| In the file | Left out |
|---|---|
| the student's record (names, birth date, LRN, grade, section, guardian name and mobile, when added) | other students, always |
| the photo thumbnail as a data URL (or null) | the gate's device id on each tap |
| each card: serial, status, when linked | parents' emails and mobiles (their data, not the child's) |
| each tap: time and whether it was a card or recorded by hand | staff actions and who did them (the Activity log; ids only) |
| alerts about the student (lost-card taps): when, handled or not | notices about *a parent* linking (`guardian_linked`): those are the parent's |
| the time-in and time-out notices sent about them (kind, time, read) | |
| linked parent accounts: name and the date linked | blocks (a school removing a parent from the child): school administration, and the parent's own record |

*Decided, not forgotten:* the file is the child's own data. Parent link blocks and "a parent linked" notices are about the parents, and a guardian can ask the school for those separately.

## What deleting removes and keeps

| Removed (one transaction) | Kept |
|---|---|
| the student, their cards (so the serial is free again) | the school, its staff and its other students |
| every tap of theirs, and every **lost-card tap that carried one of their card serials** (those taps have no student, only the serial) with its alert | the parents' accounts (they just have one child fewer; **60.2** deletes an account) |
| alerts about them, notices about them (time in and out, and "a parent linked") and the pushes still waiting for them | audit events about the student: a random id and field *names*, no name (shown as "a removed student") |
| every parent link to them, and any school block on a parent for them | |
| the photo file in storage (after the transaction): the current thumbnail only | `LinkAttempt` rows: an HMAC of school, LRN and last name that expires within 24 hours, no personal data |

A `student_deleted` event is written **inside the same transaction**, with the staff member as actor and the student's id as target, never a name.

## The changes

**1. Migration `audit_student_export_delete`.** `AuditAction` gains `student_exported` and `student_deleted`, and `Alert` gains `@@index([studentId])` (it has none, so "this student's alerts" would read the whole table; the delete asks for it). Added to `AUDIT_ACTIONS`, to the "Students" group, and a sentence each in `describe.ts` ("downloaded the data of", "deleted the records of"); the existing tests that compare the enum with the list keep this honest.

**2. `src/data/repositories/student-data-repository.ts` and `prisma-student-data-repository.ts` (new, Prisma only, like the audit repository: this must run against the real database).**
- `exportOf(schoolId, studentId): Promise<StudentExport | null>`: null for a student of another school or none. Reads the student, cards, taps (by `studentId`), alerts, tap-kind notifications and linked parents' names, each by an indexed column, all scoped by `schoolId`.
- `deleteAll(schoolId, studentId, actor): Promise<{ photoKey: string | null } | null>`: null if there's no such student at that school. In one `$transaction` (`maxWait` 5 s, `timeout` 10 s):

```ts
const inSchool = { where: { id: studentId, schoolId }, select: { photoKey: true } } as const;
if (!(await tx.student.findFirst(inSchool))) return null;   // another school's id is "none"
await lockStudentForLink(tx, studentId);            // takes turns with linking, removing a parent, and a second delete
const student = await tx.student.findFirst(inSchool);       // again, under the lock: a double click finds it gone (P-072)
if (!student) return null;
const serials = (await tx.card.findMany({ where: { studentId }, select: { serial: true } })).map((card) => card.serial);
const theirs = { schoolId, OR: [{ studentId }, ...(serials.length ? [{ cardSerial: { in: serials } }] : [])] };
// Notifications first, then the links, the order the push fan-out takes them in: it locks notification
// rows (FOR UPDATE SKIP LOCKED, so it skips the ones this holds), then takes FOR SHARE on the links, so
// this waits for a fan-out in progress instead of crossing it. The deliveries go with the notifications (Cascade).
await tx.notification.deleteMany({ where: { studentId, schoolId } });
await tx.parentStudentLink.deleteMany({ where: { studentId, schoolId } });
await tx.linkBlock.deleteMany({ where: { studentId, schoolId } });
await tx.alert.deleteMany({ where: { schoolId, OR: [{ studentId }, { tap: theirs }] } });   // an alert holds its tap (Restrict)
await tx.tap.deleteMany({ where: theirs });
await tx.card.deleteMany({ where: { studentId, schoolId } });
await tx.auditEvent.create({ data: { schoolId, actorId: actor.id, actorRole: actor.role, action: "student_deleted", targetType: "student", targetId: studentId } });
await tx.student.delete({ where: { id: studentId } });
return { photoKey: student.photoKey };
```

(The first version of this recipe deleted the links before the notifications and claimed `removeInSchool` does the same. It doesn't: it deletes pending deliveries and never touches notifications, so its order says nothing about this one. The architect found the reversed order would deadlock with the fan-out.)

`maxWait` 5 s and `timeout` **10 s** (one of ten pool connections; the tap path is far shorter). The whole call retries once when `isRetryable(error)` is true: a new `isRetryable = isDeadlock || isForeignKeyViolation` next to the others in `prisma-errors.ts`, because `retryOnce` takes one predicate. A tap saved for this student in the same instant fails the final delete's `Restrict` check, and the retry removes it too. Nothing in the repo yet shows that Prisma 7 with `adapter-pg` reports a failed `DELETE` as P2003 (every use so far is an insert), so a Postgres test provokes it on purpose and asserts the code; if it came back as something else the retry would never fire and the delete would answer 500.

**3. The tap path survives a student vanishing mid-tap (`prisma-tap-writer.ts`, `record-tap.ts`).** `recordTap` reads the card, then writes later; if the delete commits between them, `tap.create` or `alert.create` fails with P2003, which the writer rethrows, so the gate gets a 500 and its resend is answered as an unknown card. `TapWriter.record` gains a fourth answer, `"gone"` (P2003 on the tap, alert or notification write), and `recordTap` maps it to its `unknown_card` outcome without saving anything: a deleted student's tap is not kept. The gate gets a normal answer and doesn't resend.

**4. `src/services/students/student-privacy.ts` (new).**
- `exportStudentData(session, studentId)`: refuses a teacher or no school; reads `exportOf`; adds the photo (`getPhotoStorage().get`, base64 data URL); records `student_exported`; returns the file's name and body.
- `deleteStudent(session, studentId, confirmation)`: refuses a teacher or no school; **re-checks the confirmation on the server** (the typed text must equal the student's full name, ignoring case and repeated spaces), so a direct call can't skip it; calls `deleteAll`; **then** deletes the photo file (a failure is logged at **error** level with the key and no name, because the photo route is key-based and a thumbnail that stays in storage stays viewable to anyone holding its key, so someone must delete it by hand; it does not fail the delete, which has already committed). `PhotoStorage` can't list, so only the current key is removed; thumbnails from earlier replacements are deleted best-effort when replaced (`students/actions.ts`) and may linger. `docs/PRIVACY.md` says so. Always the session's school, never one from the browser.

**5. The download route `src/app/(app)/students/[id]/export/route.ts` (GET).** Session from the cookie; 401 signed out, 403 teacher or no school, 404 another school's student (the same as none). `Content-Disposition: attachment` with a filename cleaned to letters, digits and dashes (a last name can hold a quote), `Cache-Control: no-store`. Not under `/api/v1`: no non-browser client needs it.

**6. The server action `deleteStudentAction(studentId, confirmation)`** in `src/features/students/privacy-actions.ts`: validates the arguments (zod), calls `deleteStudent`, `refresh()`.

**7. The drawer.** `src/features/students/student-privacy-section.tsx` (new), shown only for an existing student, at the bottom of the form's scroll area: a "Privacy" heading, a plain explanation, the download link (an `<a download>` to the route), and "Delete this student…" which opens a confirm dialog that says what goes and what stays, links the download once more, and asks for the student's full name. **The dialog is rendered outside the drawer's `<form>`**: React bubbles a `submit` event through a portal to an ancestor form, which would otherwise trigger "Save student". It closes the drawer and shows a toast on success.

**8. Docs.** `docs/PRIVACY.md` gets a "Export and delete one student" section (table above, and what can't be recalled: a browser's cached copy of the photo for up to a year, `Cache-Control: private, max-age=31536000`; backups; a gate tablet holds the card until its next roster check, within 5 minutes; a tap queued offline on a tablet for the deleted student is answered as an unknown card; the monitor's live feed and any open dashboard can show the student until they refresh; a push already being sent still goes out once with the child's first name; thumbnails from earlier photo replacements may linger in storage, since it can't list; a failed photo delete is logged at error level and must be done by hand). `docs/AUDIT-LOG.md` and the recipe list.

**9. Tests.**
- Unit: the service (teacher refused, school-less refused, wrong confirmation refused and nothing deleted, name normalised, the photo deleted only after the database, a failed photo delete is a warning and not an error, `student_exported` recorded and no names in the event), the route (401, 403, 404, headers), the section and dialog, the audit readers.
- Postgres (`prisma-student-data.pg.test.ts`, new), adding to the list below: a `DELETE` of a student that still has a tap fails with P2003 and `isRetryable` is true for it (so the retry is real); a push fan-out held open in a second transaction makes the delete wait and then finish, in both orders; a second school's taps, and another school's student id, are left alone; the Alert lookup uses its new index (`EXPLAIN` in the build log).
- Tap writer: a tap whose student is deleted after the card was read ends as `unknown_card`, nothing saved.
- Super admin with no school open: 403 from the route, the service and the action.
- Postgres (the rest): the export holds this student's rows only and none of another student's, another school's student is `null`; delete removes every row listed above including a lost-card tap that carries the student's serial, and leaves another student's taps, cards and links untouched; one school can't delete another's; a tap inserted while the delete is held in a second transaction ends cleanly (deterministic, as `prisma-link-notices.pg.test.ts` does); a link-a-child racing the delete ends cleanly; the delete event carries no name.
- Browser (`e2e/student-privacy.spec.ts`, new): add a fresh student, open the drawer, the download link answers a JSON file with the student's name and not another's, delete with a wrong name (refused) and the right one, the student is gone from the list, and Activity shows "deleted the records of a removed student".

## Dead ends considered

- *Soft delete (a `deletedAt` flag):* the data would still be kept, which is the opposite of the request.
- *Deleting the student's audit events too:* they hold a random id and field names, no personal data, and they are the school's evidence of who deleted what. Kept.
- *A background job for big deletes:* a student has hundreds of rows, not millions; one transaction is simpler and either all or nothing.
- *Making the export part of `/api/v1`:* only a browser uses it; versioning it would promise an API nobody asked for.

## Checks

The usual routine (`docs/LEARNING-LOG.md`), after migrating the test database and restarting `npm run dev`, then:

```bash
npx vitest run src/services/students src/features/students src/data/repositories src/features/audit
npx playwright test e2e/student-privacy.spec.ts
```

## Architect review

*Review of this recipe, 2026-11-23: not approvable as first written; three blocking findings, all fixed above.* (1) The delete took the links before the notifications and said it followed `removeInSchool`, which it does not: the push fan-out locks notification rows and then the links, so the reversed order could deadlock; now notifications first, with the pending-fan-out test. (2) `retryOnce` takes one predicate, so `isRetryable` is new, and the P2003-on-DELETE assumption is proved by a test rather than assumed. (3) The export's treatment of link blocks and parent notices is now a stated decision. Also adopted: the tap writer's `"gone"` answer, an `Alert.studentId` index, a 10-second transaction, a sanitised download filename, an error-level log for a failed photo delete, the photo-prefix limit, and what stays stale (gate roster, monitor, a push in flight, `LinkAttempt`) written in `docs/PRIVACY.md`. No new cost beyond one small index.

## What was actually built

As written, with these differences:
- **The portal and the drawer's form.** The recipe said to render the dialog outside the drawer's `<form>`. The dialog is a Radix portal, so it already is outside it in the page; what reaches the drawer is React's event bubbling. The dialog's own `<form>` therefore calls `event.stopPropagation()` on submit, and a test wraps the section in a form and checks that pressing Enter in the dialog never submits it.
- **The manual time in and time out** also handle the writer's `"gone"` (as `not_found`), not just the gate.
- **The export's tap list** includes the lost card's taps (marked `lostCard`), found by the card serials, the same set the delete removes.
- **`isRetryable`** lives in `prisma-errors.ts`, with the proof that a failed `DELETE` is a P2003 in `prisma-student-data.pg.test.ts` (it passed).
- **Postgres tests need the new migration in the test database**; three of them (export, another school's student, the foreign-key premise) ran and passed before it, the other six wait for it.
- **`deleteAll` reads the student again under the lock** (P-072): the recipe's code read it once, before `lockStudentForLink`, so a second delete of the same student (a double click) waited for the lock and then failed on its last line with P2025 instead of answering "not found".
- **The dialog's messages live in `privacy-messages.ts`**, not in `privacy-actions.ts`: a "use server" file may only export async functions, which the build enforced and the tests did not (P-070). `src/use-server-exports.test.ts` now checks every such file.
- The sign-out, the existing `student-form.tsx` and the other drawer sections are untouched apart from one line that adds the section.
