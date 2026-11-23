import type { AuditActor } from "@/features/audit/types";
import type { StudentExport } from "@/features/students/privacy-export";

/**
 * One student's data as a whole (Step 60.3): what to download, and removing
 * all of it. Only Postgres does this: the rules are about foreign keys,
 * locks and one transaction, which a mock can't show.
 */
export interface StudentDataRepository {
  /** The student's data, or null when there's no such student at `schoolId` (another school's id is "none"). */
  exportOf(schoolId: string, studentId: string): Promise<StudentExport | null>;
  /**
   * Deletes the student and everything kept about them, in one transaction
   * with a `student_deleted` event, and gives back the photo's key so the
   * caller can delete the file. Null when there's no such student at
   * `schoolId`. Retries once when it loses a race (see the Prisma version).
   */
  deleteAll(schoolId: string, studentId: string, actor: AuditActor): Promise<{ photoKey: string | null } | null>;
}
