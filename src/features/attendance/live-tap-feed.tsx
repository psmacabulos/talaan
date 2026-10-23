import { Radio } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";
import { formatTapTime } from "./status";

function initials(student: Student): string {
  return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
}

const MAX_FEED_ITEMS = 7;

/** The taps the feed shows, newest first: the dashboard asks for just these taps' alerts. */
export function recentFeedTaps(taps: Tap[]): Tap[] {
  return [...taps].sort((a, b) => b.tappedAt.localeCompare(a.tappedAt)).slice(0, MAX_FEED_ITEMS);
}

/**
 * Today's newest taps. A lost card's tap has no student of its own (Step
 * 57): `lostCardOwners` (tap id → the card's owner) names them, marked as a
 * lost card rather than an arrival.
 */
export function LiveTapFeed({
  taps,
  students,
  lostCardOwners = new Map(),
}: {
  taps: Tap[];
  students: Student[];
  lostCardOwners?: Map<string, string | null>;
}) {
  const recent = recentFeedTaps(taps);

  if (recent.length === 0) {
    return <EmptyState icon={Radio} title="No taps yet" description="Taps appear here as students arrive." />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {recent.map((tap) => {
        const lostCard = lostCardOwners.has(tap.id);
        const studentId = lostCard ? lostCardOwners.get(tap.id) : tap.studentId;
        const student = studentId ? students.find((s) => s.id === studentId) : undefined;
        return (
          <li key={tap.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {student ? initials(student) : "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {student ? `${student.firstName} ${student.lastName}` : lostCard ? "Lost card" : "Unknown card"}
              </p>
              {lostCard ? (
                <p className="truncate text-sm text-status-absent">Lost card tapped, not counted</p>
              ) : (
                <p className="truncate text-sm text-muted-foreground">
                  {student ? `Grade ${student.gradeLevel} – ${student.section}` : "Not linked to a student"}
                </p>
              )}
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
