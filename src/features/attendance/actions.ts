"use server";

import { refresh } from "next/cache";
import { getNow } from "@/lib/clock";
import { getSession } from "@/lib/session";
import {
  staffRepository,
  studentRepository,
  tapRepository,
  cardRepository,
  schoolRepository,
  notificationRepository,
} from "@/data/repositories";
import { photoPath } from "@/features/students/photo";
import { publishTap } from "@/services/taps/tap-events";
import { DEFAULT_ATTENDANCE_TIMES, MAIN_GATE_STATION_ID, schoolToday, studentsWithoutTapToday } from "./status";
import { notifyParentsForTap } from "./notify-parents";

/**
 * The dashboard's "Simulate a tap" button (docs/PLAN.md Step 13). Picks the
 * next student — idle before absent, roster order — who hasn't tapped
 * today and actually has an active card to tap with (a student with no
 * card, or a lost one, can't produce a real tap; same pool the reference
 * prototype's own `simTap()` draws from). A teacher only ever draws from
 * their own advisory class.
 *
 * Doesn't mutate a cookie, so — unlike Step 11's `setDevSession` — nothing
 * here re-renders the page automatically; `refresh()` (next/cache) does
 * that explicitly. See docs/LEARNING-LOG.md's Step 13 entry: confirmed via
 * Next's own docs before assuming either way, since this project's
 * AGENTS.md/CLAUDE.md already flag this Next.js as having real breaking
 * changes from what training data would assume.
 */
export type SimulateTapResult =
  | { tapped: true; studentName: string }
  | { tapped: false; reason: "signed-out" | "no-school" | "everyone-in" }
  /**
   * Nobody left who *can* tap, but some students still haven't — because
   * no ID card has been issued to them yet. Worth naming them rather than
   * lumping this in with "everyone's in": seeing a student sit on "Absent"
   * all morning when they physically cannot tap is a real thing to act on
   * (Step 16 is where a card gets linked), not a quirk of the demo button.
   */
  | { tapped: false; reason: "no-card"; studentNames: string[] };

export async function simulateTap(): Promise<SimulateTapResult> {
  const session = await getSession();
  if (!session) return { tapped: false, reason: "signed-out" };
  if (!session.schoolId) return { tapped: false, reason: "no-school" };

  const roster = await studentRepository.listBySchool(session.schoolId);
  let candidates = roster;

  if (session.role === "teacher") {
    const staff = await staffRepository.getById(session.userId);
    candidates = roster.filter(
      (student) => student.gradeLevel === staff?.advisoryGradeLevel && student.section === staff?.advisorySection,
    );
  }

  // Stamped with the app's clock: the real time, or the demo morning when
  // DEMO_NOW pins it (src/lib/clock.ts).
  const now = getNow();
  const school = await schoolRepository.getById(session.schoolId);
  const day = schoolToday(now, school ?? DEFAULT_ATTENDANCE_TIMES);
  const taps = await tapRepository.listBySchoolOnDate(session.schoolId, day.date);
  const waiting = studentsWithoutTapToday(candidates, taps, day);

  const cardless: string[] = [];

  for (const student of waiting) {
    const card = await cardRepository.getActiveForStudent(session.schoolId, student.id);
    if (!card) {
      cardless.push(`${student.firstName} ${student.lastName}`);
      continue;
    }

    const tap = {
      id: crypto.randomUUID(),
      schoolId: session.schoolId,
      stationId: MAIN_GATE_STATION_ID,
      cardSerial: card.serial,
      studentId: student.id,
      tappedAt: now,
    };
    await tapRepository.create(tap);
    // The tap is in — fan it out to the student's linked parents (Step 24),
    // honoring the school's notification preference.
    await notifyParentsForTap(tap, { schoolRepository, tapRepository, notificationRepository });
    // And to any open guardhouse monitor (Step 48), so a demo without a
    // reader still shows there. Only students with no tap today are picked,
    // so it's always a time in.
    publishTap(tap.schoolId, {
      id: tap.id,
      outcome: "recorded",
      direction: "time_in",
      tappedAt: tap.tappedAt,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        gradeLevel: student.gradeLevel,
        section: student.section,
        photo: student.photoKey ? photoPath(student.photoKey) : null,
      },
    });

    refresh();
    return { tapped: true, studentName: `${student.firstName} ${student.lastName}` };
  }

  // Nothing was tapped. Say which of the two reasons it actually was, rather
  // than one message that makes the reader work out the difference.
  if (cardless.length > 0) return { tapped: false, reason: "no-card", studentNames: cardless };
  return { tapped: false, reason: "everyone-in" };
}
