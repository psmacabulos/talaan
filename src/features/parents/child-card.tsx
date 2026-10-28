import Link from "next/link";
import { ArrowRightFromLine, ArrowRightToLine, ChevronRight, type LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { dayTapSummary, latestLabel, studentStatus } from "@/features/attendance/status";
import { gradeAndSection, StudentAvatar, studentName } from "@/features/students/student-display";
import { formatSchoolTime } from "@/lib/school-time";
import { cn } from "@/lib/utils";
import type { ChildToday } from "@/services/parents/children-today";

/** Where a child's card leads: their day (Step 59.5). */
export function childPath(studentId: string): string {
  return `/parent/child/${studentId}`;
}

/**
 * One linked child on the parent home (Step 59.5), as the parent app's card
 * has it: the photo, the name, "Grade 7 – Rizal", the status, and a panel
 * with the time in and, from the 2nd tap on, the latest tap ("Out" or
 * "Back in", Step 59.3). No school name and no notification setting: the
 * owner took both off the app's card (2026-10-27), since a parent knows
 * their school. The name is the card's one link, stretched over the whole
 * card, so a screen reader hears one stop per child.
 */
export function ChildCard({ child }: { child: ChildToday }) {
  const { student, day, todayTaps } = child;
  const { timeIn, latest, taps } = dayTapSummary(student.id, todayTaps, day);
  // With one tap, the latest is the time in already shown.
  const laterTap = taps.length > 1 ? latest : undefined;

  return (
    <article className="relative flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <div className="flex gap-4">
        <StudentAvatar student={student} className="w-16 rounded-lg text-lg" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h2 className="font-heading text-lg font-semibold wrap-break-word text-foreground">
            <Link
              href={childPath(student.id)}
              className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
            >
              {studentName(student)}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">{gradeAndSection(student)}</p>
          <StatusPill status={studentStatus(student.id, todayTaps, day)} flexible={day.flexible} className="mt-1" />
        </div>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 self-center text-muted-foreground" />
      </div>

      {/* Side by side when the panel has the room, stacked when it doesn't
          (a phone with large text): a wrapping row would strand its divider. */}
      <div className="@container rounded-md bg-muted p-3">
        <div className="flex flex-col gap-3 @min-[15rem]:flex-row">
          <TimeHalf
            label="Time in"
            at={timeIn?.tappedAt}
            icon={ArrowRightToLine}
            tileClass={timeIn ? "bg-status-present" : "bg-status-idle"}
          />
          {laterTap ? (
            <TimeHalf
              label={latestLabel(laterTap.kind)}
              at={laterTap.tap.tappedAt}
              icon={laterTap.kind === "time_out" ? ArrowRightFromLine : ArrowRightToLine}
              tileClass={laterTap.kind === "time_out" ? "bg-status-out" : "bg-status-present"}
              className="border-t border-border pt-3 @min-[15rem]:border-t-0 @min-[15rem]:border-l @min-[15rem]:pt-0 @min-[15rem]:pl-3"
            />
          ) : null}
        </div>
      </div>

      {/* More than two taps: the panel no longer tells the whole day. */}
      {taps.length > 2 ? <p className="text-sm text-muted-foreground">{taps.length} taps today</p> : null}
    </article>
  );
}

/**
 * A coloured tile, then "Time in" over "7:56 AM". Green for in, blue for
 * out (never red, which only ever means Absent), grey with a dash before
 * the first tap, so a dash never sits beside a reassuring green.
 */
function TimeHalf({
  label,
  at,
  icon: Icon,
  tileClass,
  className,
}: {
  label: string;
  /** Undefined until it has happened. */
  at?: string;
  icon: LucideIcon;
  tileClass: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-card", tileClass)}
      >
        <Icon className="size-5" />
      </span>
      <p className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        {at ? (
          <time dateTime={at} className="font-heading text-base font-semibold whitespace-nowrap text-foreground">
            {formatSchoolTime(at)}
          </time>
        ) : (
          <span className="font-heading text-base font-semibold text-muted-foreground">
            <span aria-hidden="true">—</span>
            <span className="sr-only">not yet</span>
          </span>
        )}
      </p>
    </div>
  );
}
