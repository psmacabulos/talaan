import { Prisma, type PrismaClient, type Student as StudentRow } from "@/generated/prisma/client";
import { studentSchema } from "@/features/students/schemas";
import type { Student } from "@/features/students/types";
import { prisma } from "@/lib/db";
import type { StudentRepository } from "./student-repository";

/**
 * A DATE column comes back as a JavaScript `Date` at midnight UTC. The app
 * keeps birth dates as plain "YYYY-MM-DD" strings, so take just that part.
 */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → a `Date` at midnight UTC, which Postgres stores as exactly that day. */
function fromDateString(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

/** A database row → the app's own `Student`, checked by the same Zod schema the forms use. */
export function toStudent(row: StudentRow): Student {
  return studentSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    firstName: row.firstName,
    middleName: row.middleName ?? undefined,
    lastName: row.lastName,
    birthDate: toDateString(row.birthDate),
    lrn: row.lrn ?? undefined,
    gradeLevel: row.gradeLevel,
    section: row.section,
    guardianName: row.guardianName,
    guardianMobile: row.guardianMobile,
    photoUrl: row.photoUrl ?? undefined,
  });
}

/** The app's `Student` → the columns Prisma writes. The reverse of `toStudent`. */
export function toStudentData(student: Student) {
  return {
    schoolId: student.schoolId,
    firstName: student.firstName,
    middleName: student.middleName ?? null,
    lastName: student.lastName,
    birthDate: fromDateString(student.birthDate),
    lrn: student.lrn ?? null,
    gradeLevel: student.gradeLevel,
    section: student.section,
    guardianName: student.guardianName,
    guardianMobile: student.guardianMobile,
    photoUrl: student.photoUrl ?? null,
  };
}

const RECORD_NOT_FOUND = "P2025";

/**
 * Oldest first. Seeded students all share one createdAt (one createMany),
 * so the id breaks the tie: "student-0001", "student-0002", ... is the
 * seed's own order.
 */
const OLDEST_FIRST = [{ createdAt: "asc" as const }, { id: "asc" as const }];

export function createPrismaStudentRepository(db: PrismaClient = prisma): StudentRepository {
  return {
    async listBySchool(schoolId) {
      const rows = await db.student.findMany({ where: { schoolId }, orderBy: OLDEST_FIRST });
      return rows.map(toStudent);
    },
    async getById(id) {
      const row = await db.student.findUnique({ where: { id } });
      return row ? toStudent(row) : null;
    },
    async create(student) {
      const row = await db.student.upsert({
        where: { id: student.id },
        update: {},
        create: { id: student.id, ...toStudentData(student) },
      });
      return toStudent(row);
    },
    async update(student) {
      try {
        const row = await db.student.update({ where: { id: student.id }, data: toStudentData(student) });
        return toStudent(row);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND) {
          return null;
        }
        throw error;
      }
    },
    async findForLink(schoolId, { lrn, lastName, birthDate }) {
      const row = await db.student.findFirst({
        where: {
          schoolId,
          lrn,
          birthDate: fromDateString(birthDate),
          // "cruz" matches "Cruz", like the mock's toLowerCase() comparison.
          lastName: { equals: lastName.trim(), mode: "insensitive" },
        },
      });
      return row ? toStudent(row) : null;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const studentRepository = createPrismaStudentRepository();
