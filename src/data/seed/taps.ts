import type { Alert, Tap } from "@/features/attendance/types";
import { cardSerialAt } from "./cards";
import { schoolTimeToIso } from "@/lib/school-time";
import { ROSTER_STUDENT_COUNT, seedStudents } from "./students";

const STATION_ID = "station-main-gate";

/**
 * The demo morning. Times below are written as the school's own clock
 * ("07:56") and stored as the real instant (src/lib/school-time.ts), the
 * same way a real tap at the gate is: 7:56 AM in the Philippines is 23:56
 * UTC the day before. A Friday, so weekday rules apply: a Saturday or
 * Sunday has no late or absent (Step 44.6).
 */
export const SEED_DATE = "2026-06-19";

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
const scenarioTaps: Tap[] = [
  // student-0001 tapping in normally, on their current active card.
  {
    id: "00000000-0000-4000-8000-000000000001",
    schoolId: "school-balanga",
    stationId: STATION_ID,
    cardSerial: cardSerialAt(1000),
    studentId: seedStudents[0].id,
    tappedAt: schoolTimeToIso(SEED_DATE, "07:56"),
  },
  // students 0002-0005 (Rizal, grade 7) tapping in on time. Deliberately
  // stops short of the whole section: student-0006 is left with no tap, so
  // the grade 7 Rizal adviser's own dashboard (Step 13's teacher variant)
  // has someone still to arrive — otherwise their class reads 6 of 6 and
  // "Simulate a tap" has nobody left to tap in.
  ...seedStudents.slice(1, 5).map((student, i): Tap => ({
    id: `00000000-0000-4000-8000-00000000000${i + 2}`,
    schoolId: "school-balanga",
    stationId: STATION_ID,
    cardSerial: cardSerialAt(i + 1),
    studentId: student.id,
    tappedAt: schoolTimeToIso(SEED_DATE, timeAt(7, 57, i)),
  })),
  // student-0007 (Bonifacio, grade 8) tapping in late.
  {
    id: "00000000-0000-4000-8000-000000000007",
    schoolId: "school-balanga",
    stationId: STATION_ID,
    cardSerial: cardSerialAt(6),
    studentId: seedStudents[6].id,
    tappedAt: schoolTimeToIso(SEED_DATE, "08:16"),
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
    tappedAt: schoolTimeToIso(SEED_DATE, "08:05"),
  },
];

/**
 * The hand-written taps above cover the specific scenarios Step 8 needed
 * (an ordinary tap, a group tapping on time, one late arrival, one
 * lost-card tap). Step 13's dashboard needs something else on top of
 * those: a *plausible whole morning*, across every grade and every school,
 * or the attendance summary it's built on reads as a school where 4 of 6
 * grades never showed up.
 *
 * So: from student index 7 onward, most students tap in, with a few
 * deliberate gaps. The pattern is arithmetic rather than random so the
 * dashboard shows the same numbers on every run (no flaky screenshots, no
 * "it looked different a minute ago").
 *
 *   - every 7th student has no tap at all — the day's genuine absences
 *   - every 5th student taps after the 8:05 cutoff — the late arrivals
 *   - everyone else taps between 7:35 and 8:04
 *
 * Students with no active card (every 9th, see cards.ts) are skipped
 * too — no card, no tap, exactly like the real gate.
 */
const BULK_TAPS_FROM_INDEX = 7;

const bulkTaps: Tap[] = seedStudents.flatMap((student, index): Tap[] => {
  if (index < BULK_TAPS_FROM_INDEX) return [];
  if (index >= ROSTER_STUDENT_COUNT) return []; // students.ts's spare batch — kept untapped on purpose
  if (index % 7 === 0) return []; // absent today
  if (index % 9 === 0) return []; // no card issued yet (cards.ts), so nothing to tap with

  const isLate = index % 5 === 0;
  const tappedAt = isLate
    ? schoolTimeToIso(SEED_DATE, timeAt(8, 12, index % 20))
    : schoolTimeToIso(SEED_DATE, timeAt(7, 35, index % 29));

  return [
    {
      id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
      schoolId: student.schoolId,
      stationId: STATION_ID,
      cardSerial: cardSerialAt(index),
      studentId: student.id,
      tappedAt,
    },
  ];
});

/**
 * Two Balanga students' comings and goings on the demo morning (Step 49),
 * so the Attendance page shows a time out and a "3 taps" list. Their first
 * taps (in the bulk morning above) are unchanged, so no count changes:
 *   - index 25, Precious Rivera: in 8:17 (late), sent home at 8:40;
 *   - index 26, Rodel Espiritu: in 8:01, out 8:20, back in at 8:52.
 * Every gap is over the 2-minute debounce, so these are real taps.
 */
function laterTap(index: number, time: string, n: number): Tap {
  const student = seedStudents[index];
  return {
    id: `00000000-0000-4000-8000-${String(900 + n).padStart(12, "0")}`,
    schoolId: student.schoolId,
    stationId: STATION_ID,
    cardSerial: cardSerialAt(index),
    studentId: student.id,
    tappedAt: schoolTimeToIso(SEED_DATE, time),
  };
}

const comingsAndGoings: Tap[] = [laterTap(25, "08:40", 1), laterTap(26, "08:20", 2), laterTap(26, "08:52", 3)];

/** The named scenarios plus the generated morning around them. */
export const seedTaps: Tap[] = [...scenarioTaps, ...bulkTaps, ...comingsAndGoings];

export const seedAlerts: Alert[] = [
  {
    id: "alert-0001",
    schoolId: "school-balanga",
    tapId: "00000000-0000-4000-8000-000000000008",
    type: "lost_card_tapped",
    createdAt: schoolTimeToIso(SEED_DATE, "08:05"),
    acknowledged: false,
  },
];
