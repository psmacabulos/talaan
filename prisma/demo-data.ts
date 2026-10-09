import type { PrismaClient } from "@/generated/prisma/client";
import { seedSchools, seedStaff, seedStudents } from "@/data/seed";
import { toSchoolData } from "@/data/repositories/prisma-school-repository";
import { toStaffData } from "@/data/repositories/prisma-staff-repository";
import { toStudentData } from "@/data/repositories/prisma-student-repository";

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
}

/** One line per table, so you can see at a glance what's in the database. */
export async function printDemoDataSummary(db: PrismaClient) {
  console.log(`Schools: ${await db.school.count()}`);
  console.log(`Staff: ${await db.staff.count()}`);
  console.log(`Students: ${await db.student.count()}`);
}
