import type { PrismaClient } from "@/generated/prisma/client";
import { seedAlerts, seedCards, seedSchools, seedStaff, seedStudents, seedTaps } from "@/data/seed";
import { toAlertData } from "@/data/repositories/prisma-alert-repository";
import { toCardData } from "@/data/repositories/prisma-card-repository";
import { toSchoolData } from "@/data/repositories/prisma-school-repository";
import { toStaffData } from "@/data/repositories/prisma-staff-repository";
import { toStudentData } from "@/data/repositories/prisma-student-repository";
import { toTapData } from "@/data/repositories/prisma-tap-repository";

/**
 * Copies Phase 1's demo data into the database, keeping the same ids
 * ("school-balanga", ...) so the mock repositories that still point at
 * those ids keep lining up. Safe to run again: each insert skips a row
 * that already exists instead of failing on a duplicate id.
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
}

/** One line per table, so you can see at a glance what's in the database. */
export async function printDemoDataSummary(db: PrismaClient) {
  console.log(`Schools: ${await db.school.count()}`);
  console.log(`Staff: ${await db.staff.count()}`);
  console.log(`Students: ${await db.student.count()}`);
  console.log(`Cards: ${await db.card.count()}`);
  console.log(`Taps: ${await db.tap.count()}`);
  console.log(`Alerts: ${await db.alert.count()}`);
}
