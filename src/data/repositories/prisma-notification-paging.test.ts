// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { newestNotificationFirst } from "@/features/parents/notification-cursor";
import type { Notification } from "@/features/parents/types";
import { listParentNotifications } from "@/services/parents/notifications";
import { createPrismaNotificationRepository } from "./prisma-notification-repository";
import { createPrismaStudentRepository } from "./prisma-student-repository";

/**
 * The feed's order, checked against real Postgres (Step 53.2): the mock
 * repository sorts ids in JavaScript and can't show whether Postgres's
 * en_US collation agrees. Two Balanga children tap in the same millisecond,
 * with ids of both shapes, and paging through them two at a time must give
 * each exactly once, in the JavaScript order. Skipped, not failed, when
 * E2E_DATABASE_URL isn't set, like prisma-isolation.test.ts.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const BALANGA = "school-balanga";
const ANA = "student-0001";
const BEN = "student-0002";
// Far in the future, so these are the newest of both children's notifications.
const SAME_TIME = new Date("2030-01-06T00:00:00.000Z");
// Random-looking UUIDs, several sharing a start so the order is decided
// past a hyphen, plus the seed's shape.
const ROWS = [
  { id: "3f2a9c1e-0b7d-4e8a-9c3f-1a2b3c4d5e6f", studentId: ANA },
  { id: "3f2a9c1e-0b7d-4e8a-9c3f-1a2b3c4d5e70", studentId: BEN },
  { id: "3f2a9c1e-1b7d-4e8a-9c3f-1a2b3c4d5e6f", studentId: ANA },
  { id: "3f2a9c1f-0b7d-4e8a-9c3f-1a2b3c4d5e6f", studentId: BEN },
  { id: "c81d4e2a-77f0-4b3e-a1d2-9e8f7a6b5c4d", studentId: BEN },
  { id: "notification-9001", studentId: ANA },
  { id: "notification-9002", studentId: BEN },
];

describeWithDatabase("notification paging on Postgres (Step 53.2; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const notifications = createPrismaNotificationRepository(db);
  const students = createPrismaStudentRepository(db);
  const ids = ROWS.map((row) => row.id);

  beforeAll(async () => {
    await db.notification.deleteMany({ where: { id: { in: ids } } });
    await db.notification.createMany({
      data: ROWS.map((row) => ({
        ...row,
        schoolId: BALANGA,
        kind: "time_in" as const,
        tappedAt: SAME_TIME,
        read: false,
      })),
    });
  });

  afterAll(async () => {
    await db.notification.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });

  const expected = ROWS.map((row) => ({ id: row.id, tappedAt: SAME_TIME.toISOString() }))
    .sort(newestNotificationFirst)
    .map((row) => row.id);

  it("orders one child's tied rows the way JavaScript does, page after page", async () => {
    const anaExpected = expected.filter((id) => ROWS.find((row) => row.id === id)!.studentId === ANA);
    const seen: Notification[] = [];
    for (let page = 0; page < 10; page++) {
      const rows = await notifications.listPageForStudent(BALANGA, ANA, "parent-test", {
        before: seen.at(-1) ?? null,
        take: 1,
      });
      if (rows.length === 0 || !ids.includes(rows[0].id)) break;
      seen.push(...rows);
    }
    expect(seen.map((row) => row.id)).toEqual(anaExpected);
  });

  it("pages two children's tied rows once each, in the merged order", async () => {
    const links = {
      listByParent: async () =>
        [ANA, BEN].map((studentId) => ({
          id: `link-${studentId}`,
          schoolId: BALANGA,
          parentId: "parent-test",
          studentId,
          linkedAt: "2026-06-01T00:00:00.000Z",
        })),
    };
    const seen: string[] = [];
    let before: string | null = null;
    while (seen.length < ROWS.length) {
      const page = await listParentNotifications(
        "parent-test",
        { before, limit: 2 },
        { links, students, notifications },
      );
      seen.push(...page.items.map((item) => item.notification.id));
      if (!page.nextBefore) break;
      before = page.nextBefore;
    }
    expect(seen.slice(0, ROWS.length)).toEqual(expected);
  });

  it("counts unread no further than the cap", async () => {
    await expect(notifications.countUnreadForStudent(BALANGA, BEN, "parent-test", 2)).resolves.toBe(2);
  });

  it("marks a row read only for the right child at the right school", async () => {
    const row = ROWS[0];
    await expect(
      notifications.markReadForChildren(
        "parent-test",
        [{ schoolId: "school-oceanview", studentId: row.studentId }],
        row.id,
      ),
    ).resolves.toBe(false);
    await expect(
      notifications.markReadForChildren("parent-test", [{ schoolId: BALANGA, studentId: row.studentId }], row.id),
    ).resolves.toBe(true);
  });
});
