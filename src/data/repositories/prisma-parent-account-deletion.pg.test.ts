// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { ParentStudentLink } from "@/features/parents/types";
import { createPrismaParentRepository } from "./prisma-parent-repository";
import { createPrismaParentStudentLinkRepository } from "./prisma-parent-student-link-repository";

/**
 * Step 60.2's account deletion against real Postgres, where the cascades,
 * the lock order and the races live. Its parents are its own (ids starting
 * "delete-test-"), on seed children nobody is linked to, all removed
 * afterwards (they take the first free students by id, where the link-notices
 * test takes the last, as both files run at once), and so are the audit rows it makes (by school and child, as a
 * deleted parent's rows carry no actor). The mock repository can't show any
 * of this. Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const PREFIX = "delete-test-";
const LEAVING = `${PREFIX}leaving`;
const STAYING = `${PREFIX}staying`;
const NEWCOMER = `${PREFIX}newcomer`;
const PARENTS = [LEAVING, STAYING, NEWCOMER];

describeWithDatabase("deleting a parent's account on Postgres (Step 60.2; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const parents = createPrismaParentRepository(db);
  const links = createPrismaParentStudentLinkRepository(db);
  let child: { id: string; schoolId: string };
  let otherChild: { id: string; schoolId: string };

  function link(parentId: string, studentId = child.id): ParentStudentLink {
    return {
      id: crypto.randomUUID(),
      schoolId: child.schoolId,
      parentId,
      studentId,
      linkedAt: new Date().toISOString(),
    };
  }

  const audit = () =>
    db.auditEvent.findMany({
      where: { action: "parent_account_deleted", targetId: { in: [child.id, otherChild.id] } },
    });

  async function cleanUp() {
    await db.auditEvent.deleteMany({ where: { targetId: { in: [child.id, otherChild.id] } } });
    await db.notification.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await db.notification.deleteMany({ where: { recipientParentId: { in: PARENTS } } });
    await db.notification.deleteMany({ where: { aboutParentId: { in: PARENTS } } });
    await db.linkBlock.deleteMany({ where: { parentId: { in: PARENTS } } });
    await db.parentStudentLink.deleteMany({ where: { parentId: { in: PARENTS } } });
    await db.parent.deleteMany({ where: { id: { in: PARENTS } } });
  }

  async function makeParents() {
    await db.parent.createMany({
      data: PARENTS.map((id) => ({
        id,
        firstName: "Test",
        lastName: id,
        mobile: "09170000000",
        email: `${id}@example.com`,
        passwordHash: "not-a-real-hash",
      })),
    });
  }

  beforeAll(async () => {
    const free = await db.student.findMany({
      where: { schoolId: "school-balanga", parentLinks: { none: {} } },
      select: { id: true, schoolId: true },
      // From the other end of the list than the link-notices test, which runs at the same time.
      orderBy: { id: "asc" },
      take: 2,
    });
    [child, otherChild] = free;
    await cleanUp();
  });

  beforeEach(async () => {
    await cleanUp();
    await makeParents();
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("removes the parent and all of theirs, and leaves the other guardian and the child's records alone", async () => {
    await db.parentStudentLink.createMany({
      data: [link(LEAVING), link(STAYING), link(LEAVING, otherChild.id)],
    });
    const token = await db.parentToken.create({ data: { parentId: LEAVING, tokenHash: `${PREFIX}hash` } });
    await db.pushToken.create({
      data: { token: `${PREFIX}ExponentPushToken[abc]`, platform: "android", parentTokenId: token.id },
    });
    await db.parentPasswordReset.create({
      data: { parentId: LEAVING, codeHash: "x", expiresAt: new Date(Date.now() + 60_000) },
    });
    await db.linkBlock.create({ data: { schoolId: child.schoolId, parentId: LEAVING, studentId: child.id } });
    const base = { schoolId: child.schoolId, studentId: child.id, tappedAt: new Date() };
    // For the leaving parent, about them for the other guardian, and the child's shared feed.
    await db.notification.createMany({
      data: [
        { ...base, id: `${PREFIX}for`, kind: "guardian_linked", recipientParentId: LEAVING, aboutParentId: STAYING },
        { ...base, id: `${PREFIX}about`, kind: "guardian_linked", recipientParentId: STAYING, aboutParentId: LEAVING },
        { ...base, id: `${PREFIX}shared`, kind: "time_in" },
      ],
    });

    await expect(parents.deleteAccount(LEAVING)).resolves.toBe(true);

    await expect(db.parent.count({ where: { id: LEAVING } })).resolves.toBe(0);
    await expect(db.parentStudentLink.count({ where: { parentId: LEAVING } })).resolves.toBe(0);
    await expect(db.parentToken.count({ where: { parentId: LEAVING } })).resolves.toBe(0);
    await expect(db.pushToken.count({ where: { token: { startsWith: PREFIX } } })).resolves.toBe(0);
    await expect(db.parentPasswordReset.count({ where: { parentId: LEAVING } })).resolves.toBe(0);
    await expect(db.linkBlock.count({ where: { parentId: LEAVING } })).resolves.toBe(0);
    await expect(db.notification.count({ where: { id: `${PREFIX}for` } })).resolves.toBe(0);

    // The other guardian, and what they were told about the leaver, stay; the notice just loses the name.
    await expect(db.parent.count({ where: { id: STAYING } })).resolves.toBe(1);
    await expect(db.parentStudentLink.count({ where: { parentId: STAYING, studentId: child.id } })).resolves.toBe(1);
    await expect(db.notification.findUniqueOrThrow({ where: { id: `${PREFIX}about` } })).resolves.toMatchObject({
      recipientParentId: STAYING,
      aboutParentId: null,
    });
    await expect(db.notification.count({ where: { id: `${PREFIX}shared` } })).resolves.toBe(1);
    await expect(db.student.count({ where: { id: { in: [child.id, otherChild.id] } } })).resolves.toBe(2);
  });

  it("writes one event per child, in that child's school, with no actor and no parent id", async () => {
    await db.parentStudentLink.createMany({ data: [link(LEAVING), link(LEAVING, otherChild.id)] });

    await parents.deleteAccount(LEAVING);

    const events = await audit();
    expect(events.map((event) => event.targetId).sort()).toEqual([child.id, otherChild.id].sort());
    for (const event of events) {
      expect(event).toMatchObject({
        schoolId: child.schoolId,
        actorId: null,
        actorRole: null,
        targetType: "student",
        details: null,
      });
      expect(JSON.stringify(event)).not.toContain(LEAVING);
    }
  });

  it("deletes a parent with no children, writes no events, and answers false the second time", async () => {
    await expect(parents.deleteAccount(LEAVING)).resolves.toBe(true);
    await expect(audit()).resolves.toHaveLength(0);
    await expect(parents.deleteAccount(LEAVING)).resolves.toBe(false);
  });

  it("a double submit deletes once and records once", async () => {
    await db.parentStudentLink.create({ data: link(LEAVING) });

    const results = await Promise.all([parents.deleteAccount(LEAVING), parents.deleteAccount(LEAVING)]);

    expect(results.sort()).toEqual([false, true]);
    await expect(audit()).resolves.toHaveLength(1);
  });

  it("a guardian linking the same child while the parent deletes is told nothing wrong, and links cleanly", async () => {
    await db.parentStudentLink.create({ data: link(LEAVING) });
    // Hold the leaving parent's row, as a delete in progress does, so the link starts while it's there.
    let locked!: () => void;
    const hasLock = new Promise<void>((resolve) => (locked = resolve));
    let release!: () => void;
    const commit = new Promise<void>((resolve) => (release = resolve));
    const deleting = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Parent" WHERE "id" = ${LEAVING} FOR UPDATE`;
      await tx.parentStudentLink.deleteMany({ where: { parentId: LEAVING } });
      locked();
      await commit;
      await tx.parent.delete({ where: { id: LEAVING } });
    });
    await hasLock;

    const linking = links.createWithNotices(link(NEWCOMER));
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    await deleting;

    // The newcomer's link goes through; nobody is left to be told.
    await expect(linking).resolves.toMatchObject({ outcome: "linked" });
    await expect(db.parentStudentLink.count({ where: { parentId: NEWCOMER } })).resolves.toBe(1);
  });

  it("a school removing the parent and the parent deleting at once both finish, in either order", async () => {
    for (let round = 0; round < 5; round += 1) {
      await cleanUp();
      await makeParents();
      const row = await db.parentStudentLink.create({ data: link(LEAVING) });
      const principal = (
        await db.staff.findFirstOrThrow({
          where: { schoolId: child.schoolId, role: "principal" },
          select: { id: true },
        })
      ).id;

      const [removed, deleted] = await Promise.all([
        links.removeInSchool(child.schoolId, row.id, principal, "principal"),
        parents.deleteAccount(LEAVING),
      ]);

      // Whichever won: the account is gone, and neither failed.
      expect(deleted).toBe(true);
      expect(removed === null || removed.studentId === child.id).toBe(true);
      await expect(db.parent.count({ where: { id: LEAVING } })).resolves.toBe(0);
      await db.auditEvent.deleteMany({ where: { actorId: principal, targetId: child.id } });
    }
  });
});
