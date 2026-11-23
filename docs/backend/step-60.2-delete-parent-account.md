# Step 60.2: A parent deletes their own account

> **Approved and built 2026-11-23** (password only to confirm; an Account page behind a header link). Written before the code. Google Play and Apple's App Store both require an app that makes accounts to let people delete them (`docs/PARENT-APP-BRIEF.md`). The design was reviewed by the systems-architect once (see "Architect review" at the end); this recipe is reviewed again as the file the build follows.

## Why

A parent can sign up and link their children, but can never leave. This step lets them delete their own account, from the parent web portal and from the Expo app's API, with the password as confirmation. The school's records about the children are not the parent's to delete, so they stay.

```
Parent portal  ->  Account  ->  Delete my account  ->  [password]  ->  Delete
                                                         |
                          DELETE /api/v1/parents/me {password}  (the app)
                                                         v
                       one transaction: lock parent, log, remove links, remove parent
```

## What it costs

Nothing new to run: no service, package, table or env variable. One transaction of a few rows, once per deletion.

## What goes and what stays

| Goes (in one transaction) | Stays |
|---|---|
| the `Parent` row and its email (free to sign up with again) | the children's records, taps and shared notifications |
| their sign-ins (`ParentToken`) and push addresses (`PushToken`), and pushes waiting for them (`PushDelivery`) | the other guardians of the same child, and their links |
| their password-reset codes, and "removed by the school" blocks (`LinkBlock`) | the school's record that it removed them (`parent_link_removed`, in Activity) |
| their links to children (`ParentStudentLink`), and notices addressed to them (`recipientParentId`) | other guardians' link notices, which then say "A parent account" (`aboutParentId` becomes null) |

Not in our power, and said in `docs/PRIVACY.md`: pushes already delivered to a phone (they carry the child's first name), reset emails in the mail provider's logs, database backups until they expire, and Expo's own retention of receipts.

## The changes

**1. Migration `audit_parent_account_deleted` (`prisma/schema.prisma`).** `AuditAction` gains `parent_account_deleted`. `AuditEvent.actorId` and `actorRole` become nullable: null means "the parent themselves". No parent id is ever stored, so the log keeps no pseudonym of a deleted person.

**2. The audit readers accept a null actor.** `src/features/audit/types.ts` (`AuditEvent.actorId` and `actorRole` nullable), `describe.ts` (`verbFor("parent_account_deleted")`: "removed their parent account, which had access to"), `groups.ts` (in "Parents"; `groups.test.ts` and `types.test.ts` keep it honest), `src/services/audit/list-activity.ts` (`actorName` is "A parent", `actorRole` null), `activity-list.tsx` (no role in brackets when null), `prisma-audit-repository.ts` (`toAuditEvent`). Each gets its test case.

**3. `ParentRepository.deleteAccount(parentId)` (interface, Prisma and mock).** The Prisma version, in one `$transaction` with `LINK_TRANSACTION`'s timeouts:

```ts
await tx.$queryRaw`SELECT 1 FROM "Parent" WHERE id = ${parentId} FOR UPDATE`;   // lock first: a link-a-child waits
const parent = await tx.parent.findUnique({ where: { id: parentId }, select: { id: true } });
if (!parent) return false;                                                       // a double-click finds nothing
const links = await tx.parentStudentLink.findMany({ where: { parentId }, select: { schoolId: true, studentId: true } });
await tx.auditEvent.createMany({ data: links.map((link) => ({ schoolId: link.schoolId, action: "parent_account_deleted", targetType: "student", targetId: link.studentId })) });
// Links before the parent, as removeInSchool does: the push fan-out holds FOR SHARE on these rows,
// so this waits for one in progress, and its deliveries go with the parent's tokens below.
await tx.parentStudentLink.deleteMany({ where: { parentId } });
await tx.parent.delete({ where: { id: parentId } });   // cascades tokens, push, resets, blocks, notices for them
return true;
```

A parent with no children writes no events.

*Deadlocks (architect review 2).* This lock order meets `removeInSchool`'s head-on: it locks the student, deletes the link row, then `linkBlock.createMany` needs a KEY SHARE on `Parent` (its foreign key), which `FOR UPDATE` blocks, while the delete waits for that link row. Postgres aborts one side after about a second. So **both** transactions retry once on a deadlock: `deleteAccount` and `removeInSchool`. `prisma-errors.ts` gains `isDeadlock(error)`, true for `P2034` and for a `P2010` (a failed raw query) whose message carries `40P01`; the retry wraps the whole `$transaction` call (the catch sits outside it, since a failed statement aborts an interactive transaction). A deadlock that happens twice is a 500, which is fine for something this rare. Two guardians deleting at the same moment can deadlock on each other's link notices the same way, and the same retry covers it.

*Mock.* `createMockParentRepository` holds only parents, so its `deleteAccount` removes the parent and answers true. The cascades (links, notices, tokens) are covered by the Postgres test only, which says so in its header.

**4. The races a delete leaves behind (`prisma-parent-student-link-repository.ts`, `prisma-parent-token-repository.ts`, `push-tokens.ts`).**
- *Another guardian links the same child while a parent is deleting.* `createWithNotices` reads "the child's other guardians", which still includes the deleting parent (their link is committed), then inserts a notice addressed to them, waits for the delete, and fails with the foreign-key error P2003. That guardian did nothing wrong, so the whole `$transaction` is **retried once** (outside the transaction, as above); the retry re-reads the guardians and the deleted one is gone. Only if the parent being linked has gone is it answered "not found".
- *A sign-in or a push-token registration for a deleted parent* (`parentToken.create`, push registration) fails with P2003: answered 401 `unauthorized`, never a 500.
- Tests: a held `FOR UPDATE` in a second transaction (the way `prisma-link-notices.pg.test.ts` gates its races) makes each race deterministic; one more runs `removeInSchool` and `deleteAccount` in parallel and expects both to finish.

**5. `src/services/parents/delete-parent-account.ts`.**

```ts
export async function deleteParentAccount(parentId: string, password: unknown, deps): Promise<DeleteResult> {
  const parent = await deps.parents.getById(parentId);
  if (!parent) return { ok: false, code: "unauthorized" };
  // The email comes from the database, never the request, and the account verified must be this one.
  const signIn = await checkParentSignIn({ email: parent.email, password }, deps.signIn);
  if (!signIn.ok) return { ok: false, code: signIn.code };            // invalid_input, too_many_tries, wrong_credentials
  if (signIn.parent.id !== parentId) return { ok: false, code: "unauthorized" };
  return (await deps.parents.deleteAccount(parentId)) ? { ok: true } : { ok: false, code: "unauthorized" };
}
```

Reusing the sign-in check keeps its per-email and per-address limits (5 wrong tries lock it for 15 minutes). A separate limit would only give an attacker a second budget.

**6. The API: `DELETE /api/v1/parents/me`** in `src/app/api/v1/parents/me/route.ts`. `requireParent`, then the JSON body `{ password }`. 204 on success; 400 `invalid_input`; **403 `wrong_password`** (a new code in `api-responses.ts`, so a mistyped password is never confused with the 401 that makes the Expo app sign out); 401 `unauthorized` when the account or token is already gone; 429 `too_many_tries`. Never logs the body. Its test shows the body is not reported and that the parent's phones get 401 straight after.

**7. The web portal.**
- `src/app/parent/(protected)/account/page.tsx` (new): the parent's name, email and mobile, and a "Delete my account" section that says plainly what goes and what stays.
- `src/features/parents/delete-account-dialog.tsx` (new, client): a confirm dialog with a password field, inline errors, disabled while submitting, focus trapped and restored.
- `src/features/parents/auth-actions.ts`: `deleteMyAccount(password)`: reads the parent session, calls the service, clears the parent cookie, redirects to `/parent/login?deleted=1`.
- The parent layout header gets an "Account" link; the login page shows "Your account was deleted." when `?deleted=1`.

**8. `docs/PRIVACY.md` (new),** linked from the README and `docs/SCALING.md` 1.8: what is kept about a child, a parent, and what a parent deleting their account removes (this step's table), and what can't be recalled.

**9. Tests.**
- Unit: the service (wrong password, locked, another id, gone, never the body's email), the route (204/400/403/401/429, other phones get 401), the action, the dialog, the audit readers with a null actor.
- Audit readers: `list-activity.ts` checks for a null actor before looking in `staffNames`; a test that a null-actor event shows as "A parent" and never in another school's log (each event carries its own link's `schoolId`).
- Postgres cleanup of audit rows now also works for null-actor events, by `schoolId` and `targetId` (`prisma-audit-repository.pg.test.ts`, `prisma-link-blocks.pg.test.ts` clean up by `actorId` today).
- Postgres (`prisma-parent-repository.pg.test.ts`, new): everything in the table above goes or stays as listed; another guardian's links and notices intact; one event per child and none for a parent with no children; the two races above and the parallel `removeInSchool` run end cleanly.
- Browser: `e2e/parent-account.spec.ts`: sign up a fresh parent, open Account, delete with the password, land on login with the note, sign-in refused after; a principal's Activity shows "A parent" for the linked child.

## Dead ends considered

- *Deleting only the sign-ins (keeping the parent row):* not deletion; stores would reject it.
- *A separate throttle for deletion:* gives a stolen session a second guess budget.
- *The shared throttle's side effects (accepted):* `checkParentSignIn` clears the email's wrong-password count on success, and a stolen session can lock the owner out of signing in with five wrong deletes. A stolen token can already do the second through the sign-in endpoint, and a separate budget would only give it more guesses.
- *The school's block is lost with the account (accepted):* a parent the school removed from a child could delete the account and sign up again with the same email. The block was per `parentId`, so it never stopped a new account; linking a child still needs the child's LRN, last name and birth date, and the school's `parent_link_removed` event stays in Activity.
- *Storing the parent's id in the audit event:* keeps a pseudonymous id of a person who asked to be deleted.

## Checks

The usual routine (`docs/LEARNING-LOG.md`), after migrating the test database, then:

```bash
npx vitest run src/services/parents src/features/parents src/features/audit src/data/repositories
npx playwright test e2e/parent-account.spec.ts
```

## Architect review

*First review (design), 2026-11-23: sound, two blocking points, both built in above:* (1) lock the `Parent` row first, then read links, write events, delete links, delete the parent (change 3), and map the lost-race foreign-key error to "not found" (change 4); (2) build the email for the password check from the database parent and assert the verified id (change 5). Also adopted: nullable actor with "A parent" shown and no parent id stored (changes 1 and 2), reuse of the sign-in throttle (change 5), `createMany` for events, a retry on deadlock, `docs/PRIVACY.md` listing what is outside Postgres, a test that the delete body is never reported, and a note that the Expo app must wipe its stored token on 204 (`docs/PARENT-APP-BRIEF.md`). Accepted, documented: a push already claimed by the worker can still go out once after deletion.

*Second review (this recipe), 2026-11-23:* two blocking findings, both fixed above: (1) a deadlock between this delete (`Parent` locked first) and `removeInSchool` (student, link row, then a KEY SHARE on `Parent`): both now retry once on a deadlock, with a new `isDeadlock` helper and a parallel test (change 3); (2) the foreign-key retry hit the wrong person, since another guardian's link notice for the deleting parent fails: the whole link transaction is retried once, the sign-in and push-registration paths answer 401 (change 4). Also fixed: what the mock can honestly do, a 403 `wrong_password` code apart from 401 (change 6), audit-row cleanup for null actors and a null check before the staff lookup, deterministic race tests, and two accepted trade-offs written under "Dead ends". No new cost.

## What was actually built

Built as written, with these differences, all small: the migration is `audit_parent_account_deleted`; the two retries use a new `retryOnce` helper next to `isDeadlock` (`prisma-errors.ts`); a link that still fails after its retry returns a new `parent_gone` outcome that the link service answers as `no_match`; the sign-in-in-the-same-millisecond case above was left as accepted rather than mapped to a 401; the audit-row cleanup in the existing Postgres tests needed no change (their events have an actor); and the new Postgres file picks the first free children by id so it never shares a child with `prisma-link-notices.pg.test.ts`, which takes the last. The full account is in `docs/BUILD-LOG.md`, "Step 60.2", and how it works in `docs/PRIVACY.md`. `docs/PARENT-API.md` and `mobile/starter/docs/PLAN.md` (M3) were updated for the app: copy them into its repository again.
