# Step 55.4: A principal removes a wrong link

> **Written before the code, on 2026-10-22, and approved by the owner the same day.** Updated after building where the real code differs; see "Changed while building". Cut from Step 55.3 after the systems-architect's review. The same architect reviewed this half twice: the outline before the split, then this plan (round 1). Its points are folded in below. If building changes anything, this file is updated to match before the review report. Topic docs to update while building: `docs/NOTIFICATIONS.md` ("The school's side"), `docs/PUSH.md`, `docs/PARENT-API.md`, `docs/DATA-MODEL.md`, `docs/SCALING.md` 1.2.

## Why

Since Step 55.3, a principal can see every parent account linked to a child. When one is wrong (a stranger, an ex-partner the court has kept away, a typo that linked the wrong family), seeing it isn't enough. This step adds:

1. **Remove**, in the student drawer's "Parent accounts". That parent stops seeing the child's arrivals and stops getting notifications about them, straight away.
2. **A block.** Without one, the removed parent could type the same LRN, last name and birth date and link the child again a minute later, so removing would be pointless. A removed parent can't link that child again until the school chooses **Allow again**.

## Decisions

1. **A `LinkBlock` table**, not a "removed" mark on the link (architect, before the split). Every link read and the push worker's fan-out would otherwise need "and not removed". A block row holds who was removed from which child, when, and by whom.
2. **Remove happens at once**, after a confirmation, not when the drawer's Save is pressed. It's a separate action, like removing a staff member. The confirmation uses the same `Dialog` as staff Remove and "Record time in". The architect suggested an `AlertDialog`, but the project has no such component, and staff Remove doesn't use one, so this matches what's there.
3. **Removing and relinking take turns on the child's row.** Both lock the student first (`lockStudentForLink`, from Step 55.2). Linking checks for a block **inside** its transaction, after the lock (architect). A check before the transaction would leave a moment where a removal and a relink both get through.
4. **The removed parent's queued pushes about that child are deleted**, both `waiting` and `sending` (architect). A push that comes back from Expo as "retry" goes back to `waiting`, so deleting only waiting ones could still send it later. If one is mid-send, the worker's later update just matches no row.
5. **The push worker's fan-out locks the links it reads** (`FOR SHARE OF l`, architect). Fan-out reads the links, then writes deliveries, in one transaction. Without the lock, a removal could land between the two and leave one delivery to the removed parent. With it, the removal waits the few milliseconds the fan-out takes, and its cleanup then catches those deliveries.
6. **What still gets through:** a push already handed to Expo at the moment of removal. At most one, and it's about something that happened while they were still linked.
7. **Nobody is told** about a removal: not the removed parent (the child just disappears from their app) and not the other guardians.
8. **The parent app gets `403 link_blocked`** when a blocked parent tries to link: "This child can't be linked to your account. Contact your child's school." The API's rule "never forbidden, always not found" is about not revealing whether something exists. This answer only comes after the details matched, so it reveals nothing they didn't already type (architect). It goes in the error table with that note, plus a general rule: a code the app doesn't know means "show its message".
9. **"Allow again" deletes the block.** Who removed the link, and when, is then gone. A lasting history of staff actions is Step 60's audit log.
10. **Principals and super admins only**, at their own school, the same as everything in the drawer.

```mermaid
sequenceDiagram
    participant P as Principal (drawer)
    participant A as removeParentLink
    participant DB as Postgres (one transaction)
    participant W as Push worker
    participant X as Removed parent
    P->>A: Remove Ana Santos (confirmed)
    A->>DB: lock Carmen's Student row (FOR NO KEY UPDATE)
    A->>DB: delete the link (this school only); 0 rows → already removed
    A->>DB: insert LinkBlock (Ana, Carmen, by the principal)
    A->>DB: delete Ana's waiting/sending pushes about Carmen
    DB-->>A: COMMIT
    Note over W,DB: fan-out holds FOR SHARE on the links it reads,<br/>so the delete above waited for any fan-out in progress
    X->>DB: links Carmen again (right details)
    DB-->>X: lock, then block found: 403 link_blocked
    P->>A: Allow again
    A->>DB: delete the block (this school only)
```

## Steps

### 1. The table (migration `link_blocks`)

```prisma
// A parent the school removed from a child (Step 55.4): they can't link that
// child again until the school allows it, which deletes this row.
model LinkBlock {
  id               String   @id @default(uuid())
  schoolId         String
  school           School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  parentId         String
  // Goes with the parent's account if it's ever deleted (Step 60).
  parent           Parent   @relation(fields: [parentId], references: [id], onDelete: Cascade)
  studentId        String
  student          Student  @relation(fields: [studentId], references: [id], onDelete: Restrict)
  removedAt        DateTime @default(now())
  // Empty once that staff member is removed: "by a former staff member".
  removedByStaffId String?
  removedBy        Staff?   @relation(fields: [removedByStaffId], references: [id], onDelete: SetNull)

  // One block per parent and child; also what linking looks up.
  @@unique([parentId, studentId])
  // The drawer's "Removed" list for the page's students.
  @@index([schoolId, studentId])
  // Postgres doesn't index a foreign key by itself: removing a staff member would read every row.
  @@index([removedByStaffId])
}
```

With the back-relations on `School`, `Parent`, `Student` and `Staff` (`linkBlocks LinkBlock[]`).

```bash
npx prisma migrate dev --name link_blocks --create-only   # a new table only
npx prisma migrate dev
npx prisma generate
```

Then restart `npm run dev` (P-031). The browser-test database gets it on the next `npm run test:e2e` (its setup runs `migrate deploy`).

### 2. Linking checks the block (`createWithNotices`)

Its answer gets a third case, so "already linked" and "blocked" can't be mixed up:

```ts
export type CreateLinkResult =
  | { outcome: "linked"; link: ParentStudentLink; noticesMade: number }
  | { outcome: "already_linked" }
  | { outcome: "blocked" };
```

Inside the transaction, right after `lockStudentForLink`:

```ts
const blocked = await tx.linkBlock.findUnique({
  where: { parentId_studentId: { parentId: link.parentId, studentId: link.studentId } },
  select: { id: true },
});
if (blocked) return { outcome: "blocked" as const };
```

`linkChildToParent` turns it into a new code, `link_blocked`, with the message above. It's only reached after the details matched, and that try was already taken back (Step 55.1).

### 3. Removing, listing and allowing again (`ParentStudentLinkRepository`, mock and Prisma)

```ts
/** Removes one link at `schoolId` and blocks that parent from the child, in one transaction. Null if there's no such link (any more). */
removeInSchool(schoolId: string, linkId: string, removedByStaffId: string): Promise<{ parentId: string; studentId: string } | null>;
/** The blocks of these students at `schoolId`, with the parent's name and who removed them, newest first. */
listBlocksInSchool(schoolId: string, studentIds: string[]): Promise<RemovedGuardian[]>;
/** Deletes one block at `schoolId`. True if there was one. */
allowAgainInSchool(schoolId: string, blockId: string): Promise<boolean>;
```

Prisma `removeInSchool`:

```ts
return db.$transaction(async (tx) => {
  const link = await tx.parentStudentLink.findFirst({ where: { id: linkId, schoolId }, select: { parentId: true, studentId: true } });
  if (!link) return null;
  await lockStudentForLink(tx, link.studentId);
  // Two principals removing at once: the second finds nothing left to delete.
  const { count } = await tx.parentStudentLink.deleteMany({ where: { id: linkId, schoolId } });
  if (count === 0) return null;
  await tx.linkBlock.createMany({
    data: [{ schoolId, parentId: link.parentId, studentId: link.studentId, removedByStaffId }],
    skipDuplicates: true,
  });
  // Their pushes about this child that haven't gone yet (Decision 4).
  await tx.pushDelivery.deleteMany({
    where: {
      status: { in: ["waiting", "sending"] },
      notification: { studentId: link.studentId },
      pushToken: { parentToken: { parentId: link.parentId } },
    },
  });
  return link;
}, LINK_TRANSACTION);
```

`RemovedGuardian` (`src/features/parents/types.ts`): `{ blockId, studentId, removedAt, parent: ParentName, removedBy: { firstName, lastName } | null }`.

### 4. The push fan-out locks its links (`prisma-push-outbox-repository.ts`)

The `targets` query in `fanOut` ends with `FOR SHARE OF l`. It's already in a transaction, so the lock is held until that transaction's deliveries are written.

### 5. The API's new code (`api-responses.ts`, `children/route.ts`)

- `ApiErrorCode` gets `link_blocked` → `403`.
- The route's error mapping becomes a `switch` on `result.code` with no default, so a code it forgets is a compile error (architect: today's last line turns any other code into `409 conflict`).
- `docs/PARENT-API.md`: the new row, the note on why it isn't "never forbidden", and "a code you don't know: show its message". Copy it to the app's repository after pushing.

### 6. Server Actions (`src/features/students/parent-link-actions.ts`)

`removeParentLink(linkId)` and `allowParentLinkAgain(blockId)`: signed in, a principal or super admin with a school (a teacher gets "You don't have permission to manage parent accounts."), everything at `session.schoolId`, the remover is `session.userId`, then `refresh()`. They answer `{ ok: true }` or `{ ok: false, error }`. "That parent account was already removed." comes back when the link was gone.

### 7. The drawer (`linked-parents.tsx`)

It becomes a client component.

- **Each linked parent** gets a **Remove** button (`type="button"`: it's inside the student form, and must never submit it), at least 44 px tall on a phone. It opens:

  > **Remove Ana Santos from Carmen's parent accounts?**
  > Ana Santos will stop seeing Carmen's arrivals and getting notifications about Carmen. They can't link Carmen again unless you allow it.
  > [Cancel] [Remove]

  Then a toast: "Ana Santos was removed from Carmen's parent accounts." The Remove button leaves with its row, so the dialog can't give focus back to it. Instead it focuses the section's "Parent accounts" heading (`tabIndex={-1}`, through the dialog's `onCloseAutoFocus`), and keyboard and screen-reader users stay in the drawer. The browser test checks it.
- **Removed** (only when there are some), under the list:

  > **Ana Santos** · Removed October 22, 2026 by Catherine Jongco · [Allow again]

  "by a former staff member" when the remover is gone. **Allow again** has no confirmation (it undoes a removal and changes nothing until that parent links again), then a toast: "Ana Santos can link Carmen again."
- The students page loads the blocks for its 10 students in one more query (`listBlocksInSchool`), passed down as `blocksByStudent` and looked up at render, like `guardiansByStudent`.

### 8. Tests

- **Mock repository:** remove deletes the link and saves a block; a second remove answers null; `createWithNotices` answers `blocked`; allow again deletes the block, and only at that school.
- **`prisma-link-blocks.pg.test.ts`** (new, real Postgres):
  - remove deletes that parent's `waiting` and `sending` pushes about the child, and keeps their `sent` ones, other children's, and the other guardian's;
  - two removes at once: one answers null, no unique-key error, one block;
  - a relink while blocked answers `blocked` and makes no link or notice;
  - after allow again, the parent can link and the other guardians are told again;
  - another school's id removes nothing and allows nothing.
- **`link-child-to-parent.test.ts`:** `blocked` becomes `link_blocked` with its message.
- **A route test** for `POST /api/v1/parents/children`: a blocked parent gets `403 link_blocked` (`e2e/parent-api.spec.ts`).
- **`linked-parents.test.tsx`:** the Remove dialog's words, the Removed list, "by a former staff member".
- **`e2e/parent.spec.ts`:** a new parent links a child, the principal removes them (dialog, toast, focus back in the drawer), the parent's `/parent` no longer shows the child, linking again shows the blocked message, the principal allows again, and the parent can link.
- **`isolation.test.ts`:** another school's principal can't remove a Balanga link or allow a Balanga block.

## Verify it worked

1. The routine: `npm run lint && npm run check:tokens && npm run typecheck && npm test && npm run build`, then `npm run test:e2e`.
2. Restart `npm run dev`. Link Juan Cruz as a new parent, then as the Balanga principal open Juan, **Remove** that parent, and check:
   - the parent's `/parent` no longer shows Juan;
   - linking Juan again says "This child can't be linked to your account. Contact your child's school.";
   - **Allow again**, then linking works.
3. **Measure** (architect): with the parent app signed in on a phone, record the child's time in by hand (so a push is queued for that parent), remove the parent straight away, and check in `psql` that no `PushDelivery` row is left for that parent and child after the worker's next wake:

   > **Opening `psql`.** Docker must be running (if `docker ps` doesn't list `talaan-postgres`, run `docker start talaan-postgres` first).
   >
   > ```bash
   > docker exec -it talaan-postgres psql -U postgres -d talaan
   > ```
   >
   > The prompt changes to `talaan=#`. Type `\q` to leave. What each part of the command means: [Learning log: getting into `psql`](../LEARNING-LOG.md#getting-into-psql-and-what-each-part-of-the-command-means-owner-question).

   ```sql
   SELECT count(*) FROM "PushDelivery" d
   JOIN "Notification" n ON n.id = d."notificationId"
   JOIN "PushToken" p ON p.id = d."pushTokenId"
   JOIN "ParentToken" t ON t.id = p."parentTokenId"
   WHERE t."parentId" = '<the removed parent>' AND n."studentId" = '<the child>' AND d.status IN ('waiting', 'sending');
   ```

   Expect `0`.
4. After pushing: Heroku's release step runs the migration (a new, empty table). Then copy `docs/PARENT-API.md` to the app's repository.

## If something goes wrong

- **A Prisma error naming `LinkBlock` or `linkBlock` in `npm run dev`:** restart it (P-031).
- **Remove submits the student form:** the button is missing `type="button"`.
- **The removed parent still appears in the drawer:** the drawer must read `guardiansByStudent` from its props at render (Step 55.3, Decision 5), not a copy from when it opened.

## What you'll learn

- **Two actions on the same thing take turns through one lock.** Linking and removing both lock the child's row first, so whichever comes second sees what the first did.
- **`FOR SHARE` lets readers run together but makes a delete wait.** That's what closes the gap between the push worker's read and its write.
- **A `switch` the compiler checks** turns "I added an error code but forgot one place" into a build error instead of a wrong answer to the app.

## Before you commit

```bash
docker start talaan-postgres
npm run lint
npm run check:tokens
npm run typecheck
npm test
npm run build
npx playwright test   # before a push
```

## Known limits

- **A push already handed to Expo** when the link is removed can still arrive: at most one.
- **A parent allowed back sees the child's whole feed again**, including notifications made while they were blocked, because everything a parent sees is read through their links (architect's code review).
- **After "Allow again" the record of the removal is gone**; a lasting history of staff actions is Step 60's audit log.
- **The same person can sign up with a new account.** The child's guardians are told again, and the new link shows on the dashboard.

## Changed while building

1. **Focus after a removal** goes to the "Parent accounts" heading. The recipe only said "back to the drawer"; building it showed the button it would normally return to is gone by then.
2. **The students page loads the guardians and the blocks together** (`Promise.all`), through one helper, `parentAccountsOf`.
3. **The mock repository** keeps its blocks in a `blocks` array it can be given (`LinkBlockRecord`), and takes `staff` for the "by …" names, like Step 55.3's `parents` and `students`.
4. **The two Server Actions check their id with Zod** (`z.string().min(1).max(64)`, architect's code review), as every Server Action does here: they can be called with anything.
5. **The browser test** signs the principal in alongside the parent (separate cookies), so one test can go back and forth. It checks the API's `403` with the same parent's own token.

## What's next

Step 55.5: forgot password by email.
