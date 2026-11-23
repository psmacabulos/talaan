import type { AuditAction } from "./types";

/** The Activity page's filter chips (Step 60.1): each is a handful of actions. */
export const AUDIT_GROUPS = [
  { id: "students", label: "Students", actions: ["student_created", "student_updated"] },
  { id: "cards", label: "ID cards", actions: ["card_linked", "card_replaced", "card_marked_lost"] },
  { id: "staff", label: "Staff", actions: ["staff_invited", "staff_removed", "staff_link_created"] },
  { id: "parents", label: "Parents", actions: ["parent_link_removed", "parent_link_allowed_again", "parent_account_deleted"] },
  {
    id: "attendance",
    label: "Attendance",
    actions: ["time_in_recorded", "time_out_recorded", "attendance_times_changed"],
  },
  { id: "school", label: "School", actions: ["school_opened"] },
] as const satisfies readonly { id: string; label: string; actions: readonly AuditAction[] }[];

export type AuditGroupId = (typeof AUDIT_GROUPS)[number]["id"];

/** The actions of a group, or null for "everything". */
export function actionsOfGroup(group: AuditGroupId | "all"): readonly AuditAction[] | null {
  return AUDIT_GROUPS.find((candidate) => candidate.id === group)?.actions ?? null;
}
