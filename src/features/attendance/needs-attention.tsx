import { AlertTriangle } from "lucide-react";
import type { OpenAlert } from "@/data/repositories";
import type { Student } from "@/features/students/types";
import type { Alert, Tap } from "./types";
import { formatSchoolDate, schoolDateOf } from "@/lib/school-time";
import { MarkHandledButton } from "./mark-handled-button";
import { formatTapTime } from "./status";

const ALERT_COPY: Record<Alert["type"], string> = {
  lost_card_tapped: "A card already reported lost was just tapped",
};

/** How many open alerts the dashboard lists; "N open" still counts them all. */
export const ALERTS_SHOWN = 10;

/** "at 8:05 AM" for today, "on June 20, 2026 at 8:05 AM" for an older alert nobody has dealt with yet. */
function whenTapped(tap: Tap, today: string): string {
  const time = formatTapTime(tap.tappedAt);
  return schoolDateOf(tap.tappedAt) === today ? `at ${time}` : `on ${formatSchoolDate(tap.tappedAt)} at ${time}`;
}

/**
 * Open alerts, whatever day they were raised, each with the tap behind it
 * (loaded together, Step 57). A lost card's tap has no student, so the
 * alert names the owner, and says the tap didn't count for them.
 */
export function NeedsAttention({
  alerts,
  students,
  today,
}: {
  alerts: OpenAlert[];
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
        // The tap's own student only for an alert the old code wrote during
        // Step 57's deploy, when the owner was still on the tap.
        const ownerId = alert.studentId ?? alert.tap.studentId;
        const owner = ownerId ? students.find((s) => s.id === ownerId) : undefined;
        const name = owner ? `${owner.firstName} ${owner.lastName}` : undefined;

        return (
          <li key={alert.id} className="flex gap-3 rounded-lg border-l-4 border-status-absent bg-status-absent-bg p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-absent" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">{ALERT_COPY[alert.type]}</p>
                <p className="text-sm text-muted-foreground">
                  {name ? `${name}'s card` : "A card"}, {whenTapped(alert.tap, today)}.{" "}
                  {name ? "It didn't count as their time in." : "It didn't count as anyone's time in."}
                </p>
              </div>
              <MarkHandledButton
                alertId={alert.id}
                label={name ? `Mark handled: ${name}'s lost card` : "Mark handled: lost card"}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
