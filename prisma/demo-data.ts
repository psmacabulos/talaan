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
import { SEED_PARENT_PASSWORD_HASH, SEED_STAFF_PASSWORD_HASH } from "@/data/seed/staff-password";
import { toAlertData } from "@/data/repositories/prisma-alert-repository";
import { toCardData } from "@/data/repositories/prisma-card-repository";
import { toNotificationData } from "@/data/repositories/prisma-notification-repository";
import { toParentData } from "@/data/repositories/prisma-parent-repository";
import { toParentStudentLinkData } from "@/data/repositories/prisma-parent-student-link-repository";
import { toSchoolData } from "@/data/repositories/prisma-school-repository";
import { toStaffData } from "@/data/repositories/prisma-staff-repository";
import { toStudentData } from "@/data/repositories/prisma-student-repository";
import { toTapData } from "@/data/repositories/prisma-tap-repository";

/** The demo schools that start with a published privacy notice (Step 60.4). */
const DEMO_NOTICE_SCHOOLS = ["school-balanga", "school-oceanview"];

/** Clearly a sample, so no one mistakes it for a real school's notice. */
const SAMPLE_PRIVACY_NOTICE = `Sample notice for the demo. Your school writes its own.

This school keeps each student's name, birth date, LRN, grade and section, a guardian's name and mobile number, a photo for the gate's screen, and the times their ID card is tapped at the gate. We use them to record attendance and to tell parents when their child arrives and leaves.

Only the school's principal and staff can see a student's records. A teacher sees their own advisory class. We delete a student's records when a guardian asks.

To see what we keep about your child, or to ask us to correct or delete it, contact the principal's office.`;

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

  // Step 60.4: sample wording for two demo schools; Crimson Ridge has none,
  // so a school without a notice can be seen too. Never run this against a
  // live school: the live site's demo data was loaded once, at the first
  // deploy. Even then, skipDuplicates leaves a school's own version 1 alone
  // instead of adding this sample over it.
  await db.privacyNotice.createMany({
    data: DEMO_NOTICE_SCHOOLS.map((schoolId) => ({ schoolId, version: 1, body: SAMPLE_PRIVACY_NOTICE })),
    skipDuplicates: true,
  });

  // Every active demo staff account signs in with the demo password
  // (SEED_STAFF_PASSWORD). An invited one has none until Step 50.5's link.
  for (const staff of seedStaff) {
    await db.staff.upsert({
      where: { id: staff.id },
      update: {},
      create: {
        id: staff.id,
        ...toStaffData(staff),
        passwordHash: staff.status === "active" ? SEED_STAFF_PASSWORD_HASH : null,
      },
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

  // Every demo parent signs in with the same demo password, stored as its
  // fixed hash (Step 55.6), so the browser tests can make a parent cookie
  // with the matching password fingerprint.
  for (const parent of seedParents) {
    await db.parent.upsert({
      where: { id: parent.id },
      update: {},
      create: { id: parent.id, ...toParentData(parent), passwordHash: SEED_PARENT_PASSWORD_HASH },
    });
  }

  // After parents and students: a link points at both.
  await db.parentStudentLink.createMany({
    data: seedParentStudentLinks.map((link) => ({ id: link.id, ...toParentStudentLinkData(link) })),
    skipDuplicates: true,
  });

  await db.notification.createMany({
    // The seed's notifications are history: marked pushed, so the push worker (Step 54) never sends them.
    data: seedNotifications.map((notification) => ({
      id: notification.id,
      ...toNotificationData(notification),
      pushedAt: new Date(),
    })),
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
