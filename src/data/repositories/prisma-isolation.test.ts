// @vitest-environment node
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaCardRepository } from "./prisma-card-repository";
import { createPrismaNotificationRepository } from "./prisma-notification-repository";
import { createPrismaStaffRepository } from "./prisma-staff-repository";
import { createPrismaStudentRepository } from "./prisma-student-repository";
import { createPrismaTapRepository } from "./prisma-tap-repository";

/**
 * Step 51: the only test that proves the real `where` clauses. It runs the
 * Prisma repositories against the browser tests' database (filled with the
 * demo data by `npm run db:reset` or a browser test run) and asks for
 * Balanga's rows as Oceanview. Every answer must be "not found", and every
 * write must change nothing. Skipped, not failed, when E2E_DATABASE_URL
 * isn't set, so `npm test` still works without Docker.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const BALANGA = "school-balanga";
const OCEANVIEW = "school-oceanview";

describeWithDatabase("Prisma repositories keep schools apart (Step 51; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const students = createPrismaStudentRepository(db);
  const staff = createPrismaStaffRepository(db);
  const cards = createPrismaCardRepository(db);
  const taps = createPrismaTapRepository(db);
  const notifications = createPrismaNotificationRepository(db);

  afterAll(() => db.$disconnect());

  it("students: another school's id finds nothing and updates nothing", async () => {
    const student = await db.student.findFirstOrThrow({ where: { schoolId: BALANGA } });
    await expect(students.getInSchool(BALANGA, student.id)).resolves.toMatchObject({ id: student.id });

    await expect(students.getInSchool(OCEANVIEW, student.id)).resolves.toBeNull();
    const own = await students.getInSchool(BALANGA, student.id);
    await expect(students.update(OCEANVIEW, { ...own!, firstName: "Changed" })).resolves.toBeNull();
    await expect(students.getInSchool(BALANGA, student.id)).resolves.toMatchObject({ firstName: student.firstName });
  });

  it("staff: another school's id finds nothing and removes nothing", async () => {
    const teacher = await db.staff.findFirstOrThrow({ where: { schoolId: BALANGA, role: "teacher" } });
    await expect(staff.getInSchool(OCEANVIEW, teacher.id)).resolves.toBeNull();
    await staff.remove(OCEANVIEW, teacher.id);
    await expect(staff.getInSchool(BALANGA, teacher.id)).resolves.toMatchObject({ id: teacher.id });
  });

  it("cards: another school sees no card history and can't mark a card lost", async () => {
    const card = await db.card.findFirstOrThrow({ where: { schoolId: BALANGA, status: "active" } });
    await expect(cards.listByStudent(OCEANVIEW, card.studentId)).resolves.toEqual([]);
    await expect(cards.getActiveForStudent(OCEANVIEW, card.studentId)).resolves.toBeNull();
    await expect(cards.markLost(OCEANVIEW, card.id)).resolves.toBeNull();
    await expect(cards.getActiveForStudent(BALANGA, card.studentId)).resolves.toMatchObject({ id: card.id });
  });

  it("taps: another school finds neither a tap nor a student's taps", async () => {
    const tap = await db.tap.findFirstOrThrow({ where: { schoolId: BALANGA, studentId: { not: null } } });
    await expect(taps.getInSchool(OCEANVIEW, tap.id)).resolves.toBeNull();
    await expect(taps.listByStudent(OCEANVIEW, tap.studentId!)).resolves.toEqual([]);
    await expect(taps.getInSchool(BALANGA, tap.id)).resolves.toMatchObject({ id: tap.id });
  });

  it("notifications: another school finds nothing and marks nothing read", async () => {
    const notification = await db.notification.findFirstOrThrow({ where: { schoolId: BALANGA } });
    await expect(notifications.getInSchool(OCEANVIEW, notification.id)).resolves.toBeNull();
    await expect(
      notifications.listPageForStudent(OCEANVIEW, notification.studentId, { before: null, take: 10 }),
    ).resolves.toEqual([]);
    await expect(notifications.countUnreadForStudent(OCEANVIEW, notification.studentId, 10)).resolves.toBe(0);
    await expect(
      notifications.markReadForChildren([{ schoolId: OCEANVIEW, studentId: notification.studentId }], notification.id),
    ).resolves.toBe(false);
    await expect(notifications.getInSchool(BALANGA, notification.id)).resolves.toMatchObject({
      read: notification.read,
    });
  });
});
