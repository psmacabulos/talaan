import {
  studentDataRepository,
  studentRepository,
  type StudentDataRepository,
  type StudentRepository,
} from "@/data/repositories";
import type { StudentExportFile } from "@/features/students/privacy-export";
import { fileSlug, isConfirmed } from "@/features/students/privacy-confirm";
import type { Role } from "@/features/staff/types";
import { getNow } from "@/lib/clock";
import { schoolDateOf } from "@/lib/school-time";
import { getPhotoStorage, type PhotoStorage } from "@/lib/storage/photo-storage";
import { actorOf, recordAudit } from "@/services/audit/record-audit";

/** What the caller's session says: who, which role, and which school (null for a super admin with none open). */
export type PrivacySession = { userId: string; role: Role; schoolId: string | null };

export type ExportStudentResult =
  { ok: true; fileName: string; body: string } | { ok: false; code: "forbidden" | "not_found" };

export type DeleteStudentResult = { ok: true } | { ok: false; code: "forbidden" | "not_found" | "wrong_confirmation" };

export type StudentPrivacyDeps = {
  data: Pick<StudentDataRepository, "exportOf" | "deleteAll">;
  students: Pick<StudentRepository, "getInSchool">;
  photos: Pick<PhotoStorage, "get" | "delete">;
  audit: typeof recordAudit;
  now: () => string;
};

function liveDeps(): StudentPrivacyDeps {
  return {
    data: studentDataRepository,
    students: studentRepository,
    photos: getPhotoStorage(),
    audit: recordAudit,
    now: getNow,
  };
}

/** Only a principal or super admin, and only for the school they have open. A teacher never. */
function schoolOf(session: PrivacySession): string | null {
  return session.role === "teacher" ? null : session.schoolId;
}

/**
 * The download (Step 60.3): everything the school keeps about one student,
 * for the principal to hand to their guardian. The school is the session's,
 * never the address's, so another school's student is "not found". The
 * photo goes in as a data URL (a thumbnail, a few KB); a photo that can't
 * be read leaves it out rather than failing the whole download. Recorded in
 * the Activity log, without a name.
 */
export async function exportStudentData(
  session: PrivacySession,
  studentId: string,
  deps: StudentPrivacyDeps = liveDeps(),
): Promise<ExportStudentResult> {
  const schoolId = schoolOf(session);
  if (!schoolId) return { ok: false, code: "forbidden" };

  const data = await deps.data.exportOf(schoolId, studentId);
  if (!data) return { ok: false, code: "not_found" };

  let photo: string | null = null;
  if (data.student.photoKey) {
    try {
      const stored = await deps.photos.get(data.student.photoKey);
      if (stored) photo = `data:${stored.contentType};base64,${Buffer.from(stored.bytes).toString("base64")}`;
    } catch {
      console.warn("privacy: a student's photo could not be read for the download");
    }
  }

  const exportedAt = deps.now();
  const file: StudentExportFile = { format: 1, exportedAt, photo, ...data };
  await deps.audit({
    schoolId,
    actor: actorOf(session),
    action: "student_exported",
    targetType: "student",
    targetId: studentId,
  });
  return {
    ok: true,
    fileName: `bantay-aral-${fileSlug(data.student.lastName)}-${schoolDateOf(exportedAt)}.json`,
    body: JSON.stringify(file, null, 2),
  };
}

/**
 * Deletes one student and everything kept about them (Step 60.3). The
 * confirmation is checked here, on the server: the student's name as typed,
 * so a request sent straight to the action can't skip it. The database goes
 * first, in one transaction with its own record; the photo file is deleted
 * after. A file that can't be deleted does not undo the deletion, and is
 * logged at error level with its key (no name), because the photo address
 * works for anyone who holds the key until the file is gone.
 */
export async function deleteStudent(
  session: PrivacySession,
  studentId: string,
  confirmation: string,
  deps: StudentPrivacyDeps = liveDeps(),
): Promise<DeleteStudentResult> {
  const schoolId = schoolOf(session);
  if (!schoolId) return { ok: false, code: "forbidden" };

  const student = await deps.students.getInSchool(schoolId, studentId);
  if (!student) return { ok: false, code: "not_found" };
  if (!isConfirmed(confirmation, student)) return { ok: false, code: "wrong_confirmation" };

  const deleted = await deps.data.deleteAll(schoolId, studentId, actorOf(session));
  if (!deleted) return { ok: false, code: "not_found" };

  if (deleted.photoKey) {
    try {
      await deps.photos.delete(deleted.photoKey);
    } catch {
      console.error(
        `privacy: a deleted student's photo is still in storage and must be removed by hand: ${deleted.photoKey}`,
      );
    }
  }
  return { ok: true };
}
