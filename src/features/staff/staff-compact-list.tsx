import { StaffAvatar, staffName, staffSummary } from "./staff-display";
import { StaffRowMenu } from "./staff-row-menu";
import { StaffStatusBadge } from "./staff-status-badge";
import type { Staff } from "./types";

/**
 * This school's staff on screens narrower than 768px (Step 27.6): one
 * short card per person, so a long list is quick to scroll on a phone
 * instead of squeezing in the desktop table. Cards rather than one divided
 * list since Step 27.7, to match the students page.
 *
 * Each row says only what tells people apart. The second line is what
 * they do ("Adviser, Grade 7 – Rizal"), which already implies the role, so
 * there are no column labels. Status shows only when it's the exception
 * (Invited); an active account shows nothing. The email lives in the ⋮
 * menu. `StaffTable` shows every field as columns from 768px up.
 */
export function StaffCompactList({ items, currentUserId }: { items: Staff[]; currentUserId: string }) {
  return (
    <ul aria-label="Staff" className="flex flex-col gap-2">
      {items.map((staff) => (
        <li
          key={staff.id}
          className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card py-2 pr-1 pl-4"
        >
          <StaffAvatar staff={staff} className="size-10" />
          <div className="min-w-0 flex-1 py-1">
            <h3 className="text-base leading-snug font-semibold wrap-break-word text-foreground">{staffName(staff)}</h3>
            {/* The Invited tag sits on this second line, not beside the name,
                so the name keeps the row's full width on a narrow phone. */}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm leading-snug text-muted-foreground">{staffSummary(staff)}</p>
              {staff.status === "invited" ? <StaffStatusBadge status={staff.status} className="px-2 py-0.5" /> : null}
            </div>
          </div>
          {/* 44px touch target, kept at the row's edge so the rows' text lines up whether or not there's a menu. */}
          <div className="flex size-11 shrink-0 items-center justify-center">
            <StaffRowMenu staff={staff} currentUserId={currentUserId} className="size-11" />
          </div>
        </li>
      ))}
    </ul>
  );
}
