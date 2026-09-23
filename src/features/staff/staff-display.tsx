import { cn } from "@/lib/utils";
import type { Staff } from "./types";

/**
 * Display pieces shared by the desktop table and the mobile cards (Step
 * 27.6), so the two views of the same record can't disagree on wording.
 */
export const ROLE_LABEL: Record<Staff["role"], string> = {
  super_admin: "Super admin",
  principal: "Principal",
  teacher: "Teacher",
};

export function staffName(staff: Staff): string {
  return `${staff.firstName} ${staff.lastName}`;
}

/** "Grade 10 – Rizal", or null when there's no advisory class (principals, or a teacher not assigned one yet). */
export function advisoryLabel(staff: Staff): string | null {
  return staff.advisoryGradeLevel && staff.advisorySection
    ? `Grade ${staff.advisoryGradeLevel} – ${staff.advisorySection}`
    : null;
}

/**
 * The phone list's one-line description of what someone does. "Adviser"
 * is the word Philippine schools use for a class's homeroom teacher, and it
 * already implies the teacher role, so the role isn't repeated.
 */
export function staffSummary(staff: Staff): string {
  const advisory = advisoryLabel(staff);
  return advisory ? `Adviser, ${advisory}` : ROLE_LABEL[staff.role];
}

/** Initials circle. Hidden from screen readers, since the name always sits right beside it. */
export function StaffAvatar({ staff, className }: { staff: Staff; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      {`${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase()}
    </span>
  );
}
