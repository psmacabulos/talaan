import type { PrismaClient } from "@/generated/prisma/client";
import {
  seedAlerts,
  seedCards,
  seedNotifications,
  seedParents,
  seedParentStudentLinks,
  seedSchools,
  seedStaff,
  seedStudents,
  seedTaps,
} from "@/data/seed";
import { SEED_PARENT_PASSWORD } from "@/data/repositories/parent-repository";
import { toAlertData } from "@/data/repositories/prisma-alert-repository";
import { toCardData } from "@/data/repositories/prisma-card-repository";
import { toNotificationData } from "@/data/repositories/prisma-notification-repository";
import { toParentData } from "@/data/repositories/prisma-parent-repository";
import { toParentStudentLinkData } from "@/data/repositories/prisma-parent-student-link-repository";
import { toSchoolData } from "@/data/repositories/prisma-school-repository";
import { toStaffData } from "@/data/repositories/prisma-staff-repository";
import { toStudentData } from "@/data/repositories/prisma-student-repository";
import { toTapData } from "@/data/repositories/prisma-tap-repository";
import { hashPassword } from "@/lib/password";

/**
 * Copies Phase 1's demo data into the database, keeping the same readable
 * ids ("school-balanga", "student-0001", ...) that the demo logins, the
 * browser tests and the data itself refer to. Inserted parents first,
 * children after, so every foreign key already has its row. Safe to run
 * again: each insert skips a row that already exists instead of failing
 * on a duplicate id.
 *
 * Shared by `prisma/seed.ts` (adds what's missing) and
 * `prisma/reset-demo.ts` (empties the tables first).
 */
export async function insertDemoData(db: PrismaClient) {
  // One at a time, in seed order: each row gets its own createdAt, so
  // lists come back in the same order the mock kept them.
  for (const school of seedSchools) {
    await db.school.upsert({
      where: { id: school.id },
      update: {},
      create: { id: school.id, ...toSchoolData(school) },
    });
  }

  for (const staff of seedStaff) {
    await db.staff.upsert({
      where: { id: staff.id },
      update: {},
      create: { id: staff.id, ...toStaffData(staff) },
    });
  }

  // 76 students in one query instead of 76. skipDuplicates makes it safe
  // to run again, the same job `update: {}` does for an upsert.
  await db.student.createMany({
    data: seedStudents.map((student) => ({ id: student.id, ...toStudentData(student) })),
    skipDuplicates: true,
  });

  await db.card.createMany({
    data: seedCards.map((card) => ({ id: card.id, ...toCardData(card) })),
    skipDuplicates: true,
  });

  await db.tap.createMany({
    data: seedTaps.map((tap) => ({ id: tap.id, ...toTapData(tap) })),
    skipDuplicates: true,
  });

  // After the taps: an alert points at the tap that raised it.
  await db.alert.createMany({
    data: seedAlerts.map((alert) => ({ id: alert.id, ...toAlertData(alert) })),
    skipDuplicates: true,
  });

  // Every demo parent signs in with the same demo password, stored hashed
  // like any real one. One hash for all six keeps the seed quick.
  const demoPasswordHash = await hashPassword(SEED_PARENT_PASSWORD);
  for (const parent of seedParents) {
    await db.parent.upsert({
      where: { id: parent.id },
      update: {},
      create: { id: parent.id, ...toParentData(parent), passwordHash: demoPasswordHash },
    });
  }

  // After parents and students: a link points at both.
  await db.parentStudentLink.createMany({
    data: seedParentStudentLinks.map((link) => ({ id: link.id, ...toParentStudentLinkData(link) })),
    skipDuplicates: true,
  });

  await db.notification.createMany({
    data: seedNotifications.map((notification) => ({ id: notification.id, ...toNotificationData(notification) })),
    skipDuplicates: true,
  });
}

/** One line per table, so you can see at a glance what's in the database. */
export async function printDemoDataSummary(db: PrismaClient) {
  console.log(`Schools: ${await db.school.count()}`);
  console.log(`Staff: ${await db.staff.count()}`);
  console.log(`Students: ${await db.student.count()}`);
  console.log(`Cards: ${await db.card.count()}`);
  console.log(`Taps: ${await db.tap.count()}`);
  console.log(`Alerts: ${await db.alert.count()}`);
  console.log(`Parents: ${await db.parent.count()}`);
  console.log(`Parent–child links: ${await db.parentStudentLink.count()}`);
  console.log(`Notifications: ${await db.notification.count()}`);
}
