import { deriveTapKind } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import { photoPath } from "@/features/students/photo";
import type { Student } from "@/features/students/types";
import type { GateTapEvent } from "@/services/taps/tap-events";

/** How many taps the monitor shows: the newest large, the rest below. */
export const MONITOR_TAP_COUNT = 12;

/** The taps the monitor shows, newest first: the page asks for just these taps' alerts. */
export function newestMonitorTaps(taps: Tap[]): Tap[] {
  return [...taps].sort((a, b) => Date.parse(b.tappedAt) - Date.parse(a.tappedAt)).slice(0, MONITOR_TAP_COUNT);
}

/**
 * Today's latest stored taps as monitor events, newest first, for the
 * page's first paint and after a reconnect. A tap with an alert was a lost
 * card: it has no student of its own (Step 57), so `lostCardOwners` (tap id
 * → the card's owner) names them, checked before "nobody". One with nobody
 * and no alert was an unknown card; the rest are time in or out by their
 * order in the day, as everywhere else.
 */
export function monitorEventsFromTaps(
  taps: Tap[],
  students: Student[],
  lostCardOwners: Map<string, string | null>,
): GateTapEvent[] {
  const byId = new Map(students.map((student) => [student.id, student]));
  const shown = (studentId: string | null | undefined) => {
    const student = studentId ? byId.get(studentId) : undefined;
    return student
      ? {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          gradeLevel: student.gradeLevel,
          section: student.section,
          photo: student.photoKey ? photoPath(student.photoKey) : null,
        }
      : null;
  };
  return newestMonitorTaps(taps).map((tap) => {
    if (lostCardOwners.has(tap.id)) {
      const owner = shown(lostCardOwners.get(tap.id));
      return { id: tap.id, outcome: "lost_card", direction: null, tappedAt: tap.tappedAt, student: owner };
    }
    const student = shown(tap.studentId);
    if (!student)
      return { id: tap.id, outcome: "unknown_card", direction: null, tappedAt: tap.tappedAt, student: null };
    return { id: tap.id, outcome: "recorded", direction: deriveTapKind(tap, taps), tappedAt: tap.tappedAt, student };
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
