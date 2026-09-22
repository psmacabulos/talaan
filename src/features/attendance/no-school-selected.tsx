import Link from "next/link";
import { School } from "lucide-react";

/**
 * A super admin's session has `schoolId: null` (staff.ts — only a super
 * admin can be school-less) and there's no "view this school as super
 * admin" mechanism yet (Step 25 is where that gets built, alongside real
 * school management). Rather than guess a school or crash, every
 * school-scoped page says so plainly — a real empty state, not a silent
 * fallback. `subject` names what needs a school (e.g. "student list",
 * "staff list") — it started as dashboard-only copy and was generalized
 * once a second and third caller (Students, Attendance) needed it too.
 */
export function NoSchoolSelected({ subject = "dashboard" }: { subject?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
      <School className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-heading text-base font-semibold text-foreground">Pick a school to view its {subject}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          As a super admin, you&apos;re not currently viewing a specific school — a {subject} needs one to show.
        </p>
      </div>
      <Link
        href="/schools"
        className="rounded-sm text-sm font-medium text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Go to Schools
      </Link>
    </div>
  );
}
