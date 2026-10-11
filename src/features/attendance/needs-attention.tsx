import { AlertTriangle } from "lucide-react";
import type { Student } from "@/features/students/types";
import type { Alert, Tap } from "./types";
import { formatSchoolDate, schoolDateOf } from "@/lib/school-time";
import { formatTapTime } from "./status";

const ALERT_COPY: Record<Alert["type"], string> = {
  lost_card_tapped: "A card already reported lost was just tapped",
};

/** "at 8:05 AM" for today, "on June 20, 2026 at 8:05 AM" for an older alert nobody has dealt with yet. */
function whenTapped(tap: Tap, today: string): string {
  const time = formatTapTime(tap.tappedAt);
  return schoolDateOf(tap.tappedAt) === today ? `at ${time}` : `on ${formatSchoolDate(tap.tappedAt)} at ${time}`;
}

/**
 * Open alerts, whatever day they were raised. `alertTaps` holds the tap
 * behind each alert, loaded by id, since an unacknowledged alert from an
 * earlier day isn't among today's taps.
 */
export function NeedsAttention({
  alerts,
  alertTaps,
  students,
  today,
}: {
  alerts: Alert[];
  alertTaps: Tap[];
  students: Student[];
  /** Today's date on the school's clock. */
  today: string;
}) {
  if (alerts.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {alerts.map((alert) => {
        const tap = alertTaps.find((candidate) => candidate.id === alert.tapId);
        const student = tap?.studentId ? students.find((s) => s.id === tap.studentId) : undefined;
        const name = student ? `${student.firstName} ${student.lastName}` : "an unlinked card";

        return (
          <li key={alert.id} className="flex gap-3 rounded-lg border-l-4 border-status-absent bg-status-absent-bg p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-absent" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{ALERT_COPY[alert.type]}</p>
              <p className="text-sm text-muted-foreground">
                {name}
                {tap ? `, ${whenTapped(tap, today)}.` : "."}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
