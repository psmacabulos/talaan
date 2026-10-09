import type { ParentStudentLink as LinkRow, PrismaClient } from "@/generated/prisma/client";
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
    async create(link) {
      const row = await db.parentStudentLink.upsert({
        where: { id: link.id },
        update: {},
        create: { id: link.id, ...toParentStudentLinkData(link) },
      });
      return toParentStudentLink(row);
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentStudentLinkRepository = createPrismaParentStudentLinkRepository();
