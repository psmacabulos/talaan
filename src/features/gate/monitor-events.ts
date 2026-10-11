import { deriveTapKind } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import { photoPath } from "@/features/students/photo";
import type { Student } from "@/features/students/types";
import type { GateTapEvent } from "@/services/taps/tap-events";

/** How many taps the monitor shows: the newest large, the rest below. */
export const MONITOR_TAP_COUNT = 12;

/**
 * Today's latest stored taps as monitor events, newest first, for the
 * page's first paint and after a reconnect. A tap with an alert was a lost
 * card; one with nobody was an unknown card; the rest are time in or out
 * by their order in the day, as everywhere else.
 */
export function monitorEventsFromTaps(taps: Tap[], students: Student[], lostCardTapIds: Set<string>): GateTapEvent[] {
  const byId = new Map(students.map((student) => [student.id, student]));
  return [...taps]
    .sort((a, b) => Date.parse(b.tappedAt) - Date.parse(a.tappedAt))
    .slice(0, MONITOR_TAP_COUNT)
    .map((tap) => {
      const student = tap.studentId ? byId.get(tap.studentId) : undefined;
      const shown = student
        ? {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            gradeLevel: student.gradeLevel,
            section: student.section,
            photo: student.photoKey ? photoPath(student.photoKey) : null,
          }
        : null;
      if (!shown)
        return { id: tap.id, outcome: "unknown_card", direction: null, tappedAt: tap.tappedAt, student: null };
      if (lostCardTapIds.has(tap.id)) {
        return { id: tap.id, outcome: "lost_card", direction: null, tappedAt: tap.tappedAt, student: shown };
      }
      return {
        id: tap.id,
        outcome: "recorded",
        direction: deriveTapKind(tap, taps),
        tappedAt: tap.tappedAt,
        student: shown,
      };
    });
}

/** Live events first, then the page's own list, each tap once, newest first. */
export function mergeMonitorEvents(live: GateTapEvent[], loaded: GateTapEvent[]): GateTapEvent[] {
  const seen = new Set<string>();
  return [...live, ...loaded]
    .filter((event) => (seen.has(event.id) ? false : (seen.add(event.id), true)))
    .sort((a, b) => Date.parse(b.tappedAt) - Date.parse(a.tappedAt))
    .slice(0, MONITOR_TAP_COUNT);
}
