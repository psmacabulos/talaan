import type { Role } from "@/features/staff/types";
import type { AuditAction, AuditField } from "./types";

const FIELD_LABEL: Record<AuditField, string> = {
  firstName: "first name",
  middleName: "middle name",
  lastName: "last name",
  birthDate: "birth date",
  lrn: "LRN",
  gradeLevel: "grade",
  section: "section",
  guardianName: "guardian name",
  guardianMobile: "guardian mobile",
  photo: "photo",
  lateAfter: "late after",
  absentFrom: "absent from",
};

/** What each action reads like after the person's name; `{target}` is the student, staff member or school. */
const VERB: Record<AuditAction, string> = {
  student_created: "added student",
  student_updated: "updated student",
  card_linked: "linked an ID card to",
  card_replaced: "replaced the ID card of",
  card_marked_lost: "marked the ID card lost for",
  staff_invited: "invited staff member",
  staff_removed: "removed staff member",
  staff_link_created: "made a sign-in link for staff member",
  parent_link_removed: "removed a parent's access to",
  parent_link_allowed_again: "allowed a removed parent to link again to",
  time_in_recorded: "recorded a time in for",
  time_out_recorded: "recorded a time out for",
  attendance_times_changed: "changed the attendance times",
  school_opened: "opened the school",
};

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  teacher: "Teacher",
};

export function roleLabel(role: Role): string {
  return ROLE_LABEL[role];
}

export function verbFor(action: AuditAction): string {
  return VERB[action];
}

/** "section, guardian mobile", or null when nothing is named. */
export function changedFieldsText(fields: readonly AuditField[] | undefined): string | null {
  if (!fields || fields.length === 0) return null;
  return fields.map((field) => FIELD_LABEL[field]).join(", ");
}
