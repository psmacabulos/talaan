"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/session";
import { staffRepository, studentRepository, tapRepository, cardRepository } from "@/data/repositories";
import { DASHBOARD_NOW, studentsWithoutTapToday } from "./status";

const MAIN_GATE_STATION_ID = "station-main-gate";

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
  | { tapped: false; reason: "no-school" | "everyone-in" }
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
  if (!session.schoolId) return { tapped: false, reason: "no-school" };

  const roster = await studentRepository.listBySchool(session.schoolId);
  let candidates = roster;

  if (session.role === "teacher") {
    const staff = await staffRepository.getById(session.userId);
    candidates = roster.filter(
      (student) =>
        student.gradeLevel === staff?.advisoryGradeLevel && student.section === staff?.advisorySection,
    );
  }

  const taps = await tapRepository.listBySchool(session.schoolId);
  const waiting = studentsWithoutTapToday(candidates, taps);

  const cardless: string[] = [];

  for (const student of waiting) {
    const card = await cardRepository.getActiveForStudent(student.id);
    if (!card) {
      cardless.push(`${student.firstName} ${student.lastName}`);
      continue;
    }

    await tapRepository.create({
      id: crypto.randomUUID(),
      schoolId: session.schoolId,
      stationId: MAIN_GATE_STATION_ID,
      cardSerial: card.serial,
      studentId: student.id,
      tappedAt: DASHBOARD_NOW,
    });

    refresh();
    return { tapped: true, studentName: `${student.firstName} ${student.lastName}` };
  }

  // Nothing was tapped. Say which of the two reasons it actually was, rather
  // than one message that makes the reader work out the difference.
  if (cardless.length > 0) return { tapped: false, reason: "no-card", studentNames: cardless };
  return { tapped: false, reason: "everyone-in" };
}
