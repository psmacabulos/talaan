import type { ParentStudentLink as LinkRow, Prisma, PrismaClient } from "@/generated/prisma/client";
import { parentStudentLinkSchema } from "@/features/parents/schemas";
import type { ParentStudentLink } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import type { ParentStudentLinkRepository } from "./parent-student-link-repository";

/** A database row → the app's own `ParentStudentLink`. */
export function toParentStudentLink(row: LinkRow): ParentStudentLink {
  return parentStudentLinkSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    parentId: row.parentId,
    studentId: row.studentId,
    linkedAt: row.linkedAt.toISOString(),
  });
}

/** The app's `ParentStudentLink` → the columns Prisma writes. */
export function toParentStudentLinkData(link: ParentStudentLink) {
  return {
    schoolId: link.schoolId,
    parentId: link.parentId,
    studentId: link.studentId,
    linkedAt: new Date(link.linkedAt),
  };
}

/**
 * Two parents linking one child at once wait for each other here, so the
 * second always sees the first (Step 55.2). NO KEY UPDATE, not UPDATE:
 * saving a tap or a notification takes KEY SHARE on the student, through
 * its foreign key, and must never wait on a link. Exported for the test
 * that checks exactly that.
 */
export async function lockStudentForLink(tx: Prisma.TransactionClient, studentId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Student" WHERE "id" = ${studentId} FOR NO KEY UPDATE`;
}

/**
 * How long a link waits for a free database connection, then to finish. A
 * link that runs out rolls back whole, and its try was already taken back.
 */
const LINK_TRANSACTION = { maxWait: 5_000, timeout: 10_000 };

/** In the order the links were made; the id breaks ties between seed rows. */
const FIRST_LINKED_FIRST = [{ linkedAt: "asc" as const }, { id: "asc" as const }];

export function createPrismaParentStudentLinkRepository(db: PrismaClient = prisma): ParentStudentLinkRepository {
  return {
    async listByParent(parentId) {
      const rows = await db.parentStudentLink.findMany({ where: { parentId }, orderBy: FIRST_LINKED_FIRST });
      return rows.map(toParentStudentLink);
    },
    async listByStudent(studentId) {
      const rows = await db.parentStudentLink.findMany({ where: { studentId }, orderBy: FIRST_LINKED_FIRST });
      return rows.map(toParentStudentLink);
    },
    async listBySchool(schoolId) {
      const rows = await db.parentStudentLink.findMany({ where: { schoolId }, orderBy: FIRST_LINKED_FIRST });
      return rows.map(toParentStudentLink);
    },
    async listGuardiansInSchool(schoolId, studentIds) {
      if (studentIds.length === 0) return [];
      const rows = await db.parentStudentLink.findMany({
        where: { schoolId, studentId: { in: studentIds } },
        orderBy: FIRST_LINKED_FIRST,
        include: { parent: { select: { firstName: true, lastName: true, mobile: true } } },
      });
      return rows.map((row) => ({
        linkId: row.id,
        studentId: row.studentId,
        linkedAt: row.linkedAt.toISOString(),
        parent: row.parent,
      }));
    },
    async listRecentInSchool(schoolId, since, take) {
      // Both read the (schoolId, linkedAt) index: the count, and the newest
      // few walking it backwards.
      const where = { schoolId, linkedAt: { gte: new Date(since) } };
      const [total, rows] = await Promise.all([
        db.parentStudentLink.count({ where }),
        db.parentStudentLink.findMany({
          where,
          orderBy: [{ linkedAt: "desc" }, { id: "desc" }],
          take,
          include: {
            parent: { select: { firstName: true, lastName: true } },
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
      ]);
      return {
        total,
        links: rows.map((row) => ({
          linkId: row.id,
          linkedAt: row.linkedAt.toISOString(),
          parent: row.parent,
          student: row.student,
        })),
      };
    },
    async createWithNotices(link) {
      // One transaction: a link is never saved without its notices (Step 55.2).
      return db.$transaction(async (tx) => {
        await lockStudentForLink(tx, link.studentId);

        // Skipped, not an error, when the parent and student are already
        // linked (the same form sent twice at once): an error would cancel
        // the whole transaction.
        const inserted = await tx.parentStudentLink.createMany({
          data: [{ id: link.id, ...toParentStudentLinkData(link) }],
          skipDuplicates: true,
        });
        if (inserted.count === 0) return null;

        const others = await tx.parentStudentLink.findMany({
          where: { studentId: link.studentId, schoolId: link.schoolId, parentId: { not: link.parentId } },
          select: { parentId: true },
        });
        if (others.length === 0) return { link, noticesMade: 0 };
        await tx.notification.createMany({
          data: others.map(({ parentId }) => ({
            schoolId: link.schoolId,
            studentId: link.studentId,
            kind: "guardian_linked" as const,
            tappedAt: new Date(link.linkedAt),
            recipientParentId: parentId,
            aboutParentId: link.parentId,
          })),
        });
        return { link, noticesMade: others.length };
      }, LINK_TRANSACTION);
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentStudentLinkRepository = createPrismaParentStudentLinkRepository();
