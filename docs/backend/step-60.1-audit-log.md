# Step 60.1: Activity log (who changed what)

> **Written from the real diff on 2026-11-23.** The owner said "go" to the Step 60 split and left it to my judgement whether to consult the systems-architect; I did, since this adds a table every staff action writes to. Story: `docs/BUILD-LOG.md`, "Step 60.1". How it works: `docs/AUDIT-LOG.md`.

## Why

A school will ask "who changed this child's record?" and nothing recorded it. Step 60.1 records the staff actions on student data and shows them to a principal, without ever storing a name, an email, a card serial or a changed value.

```
Activity
[Everything] [Students] [ID cards] [Staff] [Parents] [Attendance] [School]
Catherine Lopez (Principal) updated student Juan Dela Cruz.      June 19, 2026, 9:30 AM
  Changed: section, guardian mobile
```

## What it costs

One small row per staff action (tens of thousands over two years for 500 students). Two indexes. No package, no service, no cron.

## The changes

1. **`prisma/schema.prisma` and migration `…_audit_events`:** `enum AuditAction` (14 values), `enum AuditTarget`, `model AuditEvent` with the two indexes, and `School.auditEvents`. Made with `npx prisma migrate dev --name audit_events`.
2. **`src/features/audit/`:** `types.ts` (the actions, the allowed field names, the shapes), `groups.ts` (filter chips), `search-params.ts` (the URL, with a zod-checked cursor), `describe.ts` (words), `changed-fields.ts` (which student fields changed, names only), `activity-list.tsx` (the page's list).
3. **`src/data/repositories/audit-repository.ts` and `prisma-audit-repository.ts`:** `record`, `listPage` (keyset on `(createdAt, id)`), `deleteOlderThan(before, limit)`. No mock: the log has to be real.
4. **`src/services/audit/record-audit.ts`:** `recordAudit` (best-effort, `cleanDetails`, the hourly retention) and `actorOf(session)`. **`list-activity.ts`:** three reads a page.
5. **Wiring, each after its change succeeds:**
   - `students/actions.ts`: `student_created`, `student_updated` (with fields), and `card_linked`, `card_replaced`, `card_marked_lost` when the card saved.
   - `staff/actions.ts`: `staff_invited`, `staff_link_created`, `staff_removed`.
   - `students/parent-link-actions.ts`: `parent_link_allowed_again` (against the child). `removeInSchool` now takes the actor's role and writes `parent_link_removed` **inside its transaction**; `allowAgainInSchool` returns the child's id instead of true.
   - `attendance/actions.ts`: `time_in_recorded`, `time_out_recorded`. `schools/actions.ts`: `attendance_times_changed` (with the field names), `school_opened`.
6. **`StudentRepository.listByIdsInSchool`:** one query for the page's names.
7. **The page and the menu:** `src/app/(app)/activity/page.tsx`, a nav item "Activity" (`History` icon) for principals and super admins.
8. **Tests:** `record-audit.test.ts`, `list-activity.test.ts`, `types.test.ts`, `groups.test.ts`, `search-params.test.ts`, `describe.test.ts`, `changed-fields.test.ts`, `activity-list.test.tsx`, `staff/actions.test.ts`, `nav-items.test.ts`; Postgres tests `prisma-audit-repository.pg.test.ts` and an extra check in `prisma-link-blocks.pg.test.ts`; `e2e/activity.spec.ts` (added to `test:e2e`).

## The architect's review, and what changed because of it

Blocking, and built in: (1) the retention cleanup runs in `recordAudit`, not on the page view, with an index on `createdAt`; (2) a super admin is named by role, since they aren't in the school's staff list, and the page refuses with no school; (3) parent-link events are logged against the child, which needed `allowAgainInSchool` to return the child's id. Also built: the index matches the page's order, `details` is filtered by an allowlist, names come from one batched student query, and the removal event is inside its transaction. Not built, by choice: events for devices (they already log to the server log) and a date-range filter.

## Dead end

None of note. The first screenshot attempt failed because a dev server started before the migration still held the old Prisma Client in memory; restarting `npm run dev` fixes it (see `docs/BUILD-LOG.md`).

## Checks

The usual routine (`docs/LEARNING-LOG.md`), after **restarting `npm run dev`** and **applying the migration to the test database** (below), then:

```bash
npx vitest run src/features/audit src/services/audit src/data/repositories
npx playwright test e2e/activity.spec.ts
```
