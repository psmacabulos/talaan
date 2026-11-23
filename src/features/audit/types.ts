import type { Role } from "@/features/staff/types";

/**
 * What the Activity page records (Step 60.1). The same names as the
 * database's `AuditAction` enum; `types.test.ts` fails if they drift apart.
 */
export const AUDIT_ACTIONS = [
  "student_created",
  "student_updated",
  "card_linked",
  "card_replaced",
  "card_marked_lost",
  "staff_invited",
  "staff_removed",
  "staff_link_created",
  "parent_link_removed",
  "parent_link_allowed_again",
  "parent_account_deleted",
  "time_in_recorded",
  "time_out_recorded",
  "attendance_times_changed",
  "school_opened",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTarget = "student" | "staff" | "school";

/**
 * The only things an event may say about a change: the *names* of the fields
 * that changed. Never a value, a name or a number a person typed. The
 * service drops anything not on this list, so one careless call can't put a
 * minor's data in the log for good.
 */
export const AUDIT_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "birthDate",
  "lrn",
  "gradeLevel",
  "section",
  "guardianName",
  "guardianMobile",
  "photo",
  "lateAfter",
  "absentFrom",
] as const;
export type AuditField = (typeof AUDIT_FIELDS)[number];
export type AuditDetails = { fields: AuditField[] };

export type AuditActor = { id: string; role: Role };

/** What a caller says happened. `schoolId` is always the caller's own, from the session. */
export type AuditEventInput = {
  schoolId: string;
  actor: AuditActor;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: string;
  details?: { fields: readonly string[] };
};

export type AuditEvent = {
  id: string;
  action: AuditAction;
  /** Null when the parent themselves did it (Step 60.2): no parent id is ever kept. */
  actorId: string | null;
  actorRole: Role | null;
  targetType: AuditTarget;
  targetId: string;
  details: AuditDetails | null;
  createdAt: string;
};

/** Where the next page starts: the last row of this one. */
export type AuditCursor = { createdAt: string; id: string };
