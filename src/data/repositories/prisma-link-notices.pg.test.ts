// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { ParentStudentLink } from "@/features/parents/types";
import { createPrismaParentStudentLinkRepository, lockStudentForLink } from "./prisma-parent-student-link-repository";

/**
 * Step 55.2's link notices against real Postgres: only a real database
 * shows that two parents linking one child at the same moment take turns
 * on the child's row, so the second always tells the first, and that the
 * lock never holds up a tap's write. Its parents are its own (ids starting
 * "link-notice-test-"), on a seed child nobody is linked to, all removed
 * afterwards. Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const PREFIX = "link-notice-test-";
const PARENTS = ["a", "b", "c", "d"].map((name) => `${PREFIX}${name}`);

describeWithDatabase("link notices on Postgres (Step 55.2; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const links = createPrismaParentStudentLinkRepository(db);
  let child: { id: string; schoolId: string };

  function linkFor(parentId: string): ParentStudentLink {
    return {
      id: crypto.randomUUID(),
      schoolId: child.schoolId,
      parentId,
      studentId: child.id,
      linkedAt: new Date().toISOString(),
    };
  }

  async function cleanUp() {
    await db.notification.deleteMany({ where: { recipientParentId: { in: PARENTS } } });
    await db.notification.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await db.parentStudentLink.deleteMany({ where: { parentId: { in: PARENTS } } });
  }

  beforeAll(async () => {
    child = await db.student.findFirstOrThrow({
      where: { schoolId: "school-balanga", parentLinks: { none: {} } },
      select: { id: true, schoolId: true },
      orderBy: { id: "desc" },
    });
    await db.parent.deleteMany({ where: { id: { in: PARENTS } } });
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
  });

  beforeEach(cleanUp);

  afterAll(async () => {
    await cleanUp();
    await db.parent.deleteMany({ where: { id: { in: PARENTS } } });
    await db.$disconnect();
  });

  it("two new parents linking one child at the same moment make exactly one notice, from the second to the first", async () => {
    // Sent together, several times: whichever way they land, one notice.
    for (let round = 0; round < 5; round++) {
      await cleanUp();
      const results = await Promise.all([
        links.createWithNotices(linkFor(PARENTS[0])),
        links.createWithNotices(linkFor(PARENTS[1])),
      ]);
      expect(results.map((result) => result?.noticesMade).sort()).toEqual([0, 1]);

      // Whoever saved second told whoever saved first.
      const second = results.find((result) => result?.noticesMade === 1)!.link.parentId;
      const first = second === PARENTS[0] ? PARENTS[1] : PARENTS[0];
      const notices = await db.notification.findMany({ where: { studentId: child.id, kind: "guardian_linked" } });
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({ recipientParentId: first, aboutParentId: second, read: false });
      // One link row per parent and child, never two.
      for (const parentId of PARENTS.slice(0, 2)) {
        await expect(db.parentStudentLink.count({ where: { parentId, studentId: child.id } })).resolves.toBe(1);
      }
    }
  });

  it("the same parent sending the form twice at once keeps one link and tells the other guardian once", async () => {
    await links.createWithNotices(linkFor(PARENTS[2]));
    const results = await Promise.all([
      links.createWithNotices(linkFor(PARENTS[3])),
      links.createWithNotices(linkFor(PARENTS[3])),
    ]);
    expect(results.filter((result) => result === null)).toHaveLength(1);

    await expect(db.parentStudentLink.count({ where: { parentId: PARENTS[3], studentId: child.id } })).resolves.toBe(1);
    const notices = await db.notification.findMany({ where: { studentId: child.id, kind: "guardian_linked" } });
    expect(notices.map(({ recipientParentId, aboutParentId }) => ({ recipientParentId, aboutParentId }))).toEqual([
      { recipientParentId: PARENTS[2], aboutParentId: PARENTS[3] },
    ]);
  });

  /** A tap's notification for the child, written on another connection, as the gate's would be, given 2 seconds. */
  function writeTapNotification(id: string) {
    return db.$transaction([
      db.$executeRaw`SET LOCAL statement_timeout = 2000`,
      db.notification.create({
        data: {
          id: `${PREFIX}${id}`,
          schoolId: child.schoolId,
          studentId: child.id,
          kind: "time_in",
          tappedAt: new Date(),
          // History, so the push worker never sends it.
          pushedAt: new Date(),
        },
      }),
    ]);
  }

  it("makes a second link wait for the first, so it always sees it", async () => {
    let inserted!: () => void;
    const firstInserted = new Promise<void>((resolve) => (inserted = resolve));
    let release!: () => void;
    const commitFirst = new Promise<void>((resolve) => (release = resolve));

    // The first link, held open after its insert, as if it were slow.
    const first = db.$transaction(async (tx) => {
      await lockStudentForLink(tx, child.id);
      await tx.parentStudentLink.create({ data: { ...linkFor(PARENTS[0]), linkedAt: new Date() } });
      inserted();
      await commitFirst;
    });
    await firstInserted;
    const second = links.createWithNotices(linkFor(PARENTS[1]));
    // Without the lock, the second would read the links now, see nobody, and tell nobody.
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    await first;

    await expect(second).resolves.toMatchObject({ noticesMade: 1 });
    const notices = await db.notification.findMany({ where: { studentId: child.id, kind: "guardian_linked" } });
    expect(notices).toMatchObject([{ recipientParentId: PARENTS[0], aboutParentId: PARENTS[1] }]);
  });

  it("never holds up a tap's notification for the same child while a link holds its lock", async () => {
    await db.$transaction(async (tx) => {
      await lockStudentForLink(tx, child.id);
      await writeTapNotification("tap");
    });
    await expect(db.notification.count({ where: { id: `${PREFIX}tap` } })).resolves.toBe(1);
  });

  it("would hold it up with FOR UPDATE: the control that shows the test above can tell", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "Student" WHERE "id" = ${child.id} FOR UPDATE`;
        await writeTapNotification("tap-blocked");
      }),
    ).rejects.toThrow();
    await expect(db.notification.count({ where: { id: `${PREFIX}tap-blocked` } })).resolves.toBe(0);
  });
});
