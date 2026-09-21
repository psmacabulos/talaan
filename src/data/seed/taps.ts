import type { Alert, Tap } from "@/features/attendance/types";
import { cardSerialAt } from "./cards";
import { seedStudents } from "./students";

const STATION_ID = "station-main-gate";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `baseHour:baseMinute` plus `offsetMinutes`, rolling over into the next hour correctly. */
function timeAt(baseHour: number, baseMinute: number, offsetMinutes: number): string {
  const totalMinutes = baseMinute + offsetMinutes;
  const hour = baseHour + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

// A sample morning at school-balanga's main gate. Indices line up with
// seedStudents/seedCards: student-0001 (index 0) has its active card's
// serial at `cardSerialAt(1000)` (see cards.ts) and its old, now-lost card
// at `cardSerialAt(0)`.
export const seedTaps: Tap[] = [
  // student-0001 tapping in normally, on their current active card.
  {
    id: "00000000-0000-4000-8000-000000000001",
    schoolId: "school-balanga",
    stationId: STATION_ID,
    cardSerial: cardSerialAt(1000),
    studentId: seedStudents[0].id,
    tappedAt: "2026-06-20T07:56:00Z",
  },
  // students 0002-0006 (Rizal, grade 7) tapping in on time.
  ...seedStudents.slice(1, 6).map(
    (student, i): Tap => ({
      id: `00000000-0000-4000-8000-00000000000${i + 2}`,
      schoolId: "school-balanga",
      stationId: STATION_ID,
      cardSerial: cardSerialAt(i + 1),
      studentId: student.id,
      tappedAt: `2026-06-20T${timeAt(7, 57, i)}:00Z`,
    }),
  ),
  // student-0007 (Bonifacio, grade 8) tapping in late.
  {
    id: "00000000-0000-4000-8000-000000000007",
    schoolId: "school-balanga",
    stationId: STATION_ID,
    cardSerial: cardSerialAt(6),
    studentId: seedStudents[6].id,
    tappedAt: "2026-06-20T08:16:00Z",
  },
  // The lost-card scenario: someone taps student-0001's OLD, already-lost
  // card. `studentId` is still that student — a lost card doesn't erase who
  // it used to belong to, which is exactly why the alert below is useful.
  {
    id: "00000000-0000-4000-8000-000000000008",
    schoolId: "school-balanga",
    stationId: STATION_ID,
    cardSerial: cardSerialAt(0),
    studentId: seedStudents[0].id,
    tappedAt: "2026-06-20T08:05:00Z",
  },
];

export const seedAlerts: Alert[] = [
  {
    id: "alert-0001",
    schoolId: "school-balanga",
    tapId: "00000000-0000-4000-8000-000000000008",
    type: "lost_card_tapped",
    createdAt: "2026-06-20T08:05:00Z",
    acknowledged: false,
  },
];
