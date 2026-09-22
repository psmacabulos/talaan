import { Radio } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";
import { formatTapTime } from "./status";

function initials(student: Student): string {
  return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
}

const MAX_FEED_ITEMS = 7;

export function LiveTapFeed({ taps, students }: { taps: Tap[]; students: Student[] }) {
  const recent = [...taps].sort((a, b) => b.tappedAt.localeCompare(a.tappedAt)).slice(0, MAX_FEED_ITEMS);

  if (recent.length === 0) {
    return <EmptyState icon={Radio} title="No taps yet" description="Taps appear here as students arrive." />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {recent.map((tap) => {
        const student = tap.studentId ? students.find((s) => s.id === tap.studentId) : undefined;
        return (
          <li key={tap.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {student ? initials(student) : "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {student ? `${student.firstName} ${student.lastName}` : "Unknown card"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {student ? `Grade ${student.gradeLevel} – ${student.section}` : "Not linked to a student"}
              </p>
            </div>
            <time dateTime={tap.tappedAt} className="shrink-0 text-sm text-muted-foreground">
              {formatTapTime(tap.tappedAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
