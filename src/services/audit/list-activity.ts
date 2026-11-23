import {
  auditRepository,
  staffRepository,
  studentRepository,
  type AuditRepository,
  type StaffRepository,
  type StudentRepository,
} from "@/data/repositories";
import { actionsOfGroup } from "@/features/audit/groups";
import { ACTIVITY_PAGE_SIZE, type ActivityParams } from "@/features/audit/search-params";
import type { AuditAction, AuditCursor, AuditDetails, AuditEvent } from "@/features/audit/types";
import type { Role } from "@/features/staff/types";

export type ActivityRow = {
  id: string;
  action: AuditAction;
  actorName: string;
  /** Null for a parent, who has no staff role (Step 60.2). */
  actorRole: Role | null;
  /** The student's or staff member's name, or null when the event is about the school. */
  targetName: string | null;
  details: AuditDetails | null;
  createdAt: string;
};

export type ActivityPage = { rows: ActivityRow[]; next: AuditCursor | null };

type Deps = {
  audit: Pick<AuditRepository, "listPage">;
  staff: Pick<StaffRepository, "listBySchool">;
  students: Pick<StudentRepository, "listByIdsInSchool">;
};

const defaultDeps: Deps = { audit: auditRepository, staff: staffRepository, students: studentRepository };

export const A_PARENT = "A parent";
export const FORMER_STAFF = "A former staff member";
export const REMOVED_STUDENT = "a removed student";
export const REMOVED_STAFF = "a removed staff member";

/** A parent (no actor stored), a super admin (never in the school's staff list), or a staff member by name. */
function actorName(event: AuditEvent, staffNames: Map<string, string>): string {
  if (event.actorId === null || event.actorRole === null) return A_PARENT;
  if (event.actorRole === "super_admin") return "A super admin";
  return staffNames.get(event.actorId) ?? FORMER_STAFF;
}

/**
 * One page of a school's Activity (Step 60.1): three reads however long the
 * page, the events and then the school's staff and just these students for
 * their names. A super admin isn't one of the school's staff, so they're
 * named by role, never looked up. Names are read now, not stored, so a
 * removed person shows as removed and the log itself never holds a name.
 */
export async function listActivity(
  schoolId: string,
  params: ActivityParams,
  deps: Deps = defaultDeps,
): Promise<ActivityPage> {
  const events = await deps.audit.listPage(schoolId, {
    actions: actionsOfGroup(params.group),
    before: params.before,
    limit: ACTIVITY_PAGE_SIZE + 1,
  });
  const page = events.slice(0, ACTIVITY_PAGE_SIZE);

  const studentIds = [
    ...new Set(page.filter((event) => event.targetType === "student").map((event) => event.targetId)),
  ];
  const [staff, students] = await Promise.all([
    deps.staff.listBySchool(schoolId),
    deps.students.listByIdsInSchool(schoolId, studentIds),
  ]);
  const staffNames = new Map(staff.map((person) => [person.id, `${person.firstName} ${person.lastName}`]));
  const studentNames = new Map(students.map((student) => [student.id, `${student.firstName} ${student.lastName}`]));

  const rows = page.map((event): ActivityRow => {
    let targetName: string | null = null;
    if (event.targetType === "student") targetName = studentNames.get(event.targetId) ?? REMOVED_STUDENT;
    if (event.targetType === "staff") targetName = staffNames.get(event.targetId) ?? REMOVED_STAFF;
    return {
      id: event.id,
      action: event.action,
      actorName: actorName(event, staffNames),
      actorRole: event.actorRole,
      targetName,
      details: event.details,
      createdAt: event.createdAt,
    };
  });

  const last = page.at(-1);
  const next = events.length > ACTIVITY_PAGE_SIZE && last ? { createdAt: last.createdAt, id: last.id } : null;
  return { rows, next };
}
