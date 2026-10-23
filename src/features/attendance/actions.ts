"use server";

import { refresh } from "next/cache";
import { staffRepository } from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getNow } from "@/lib/clock";
import { formatSchoolTime } from "@/lib/school-time";
import { getSession } from "@/lib/session";
import { markAlertHandled as handleAlert } from "@/services/alerts/mark-alert-handled";
import { wakePushWorker } from "@/services/push/push-worker";
import { publishStoredTap } from "@/services/taps/publish-tap";
import { recordManualTimeIn } from "@/services/taps/record-manual-time-in";

export type RecordTimeInResult = { ok: true; studentName: string; time: string } | { ok: false; error: string };

/**
 * The attendance row's "Record time in" button (Step 55): a staff member
 * records a student's time in by hand, now, when their card didn't work or
 * they have none. `recordManualTimeIn` holds the rules (a teacher only for
 * their own class, nobody twice a day); this passes in who's asking, then
 * tells the parents' phones and the guardhouse monitor, the same as a
 * gate's tap.
 *
 * Doesn't change a cookie, so nothing re-renders the page by itself:
 * `refresh()` (next/cache) brings the new row in (docs/LEARNING-LOG.md,
 * Step 13).
 */
export async function recordTimeIn(studentId: string): Promise<RecordTimeInResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: SIGNED_OUT_MESSAGE };
  if (!session.schoolId) return { ok: false, error: "Pick a school first." };

  const staff = await staffRepository.getById(session.userId);
  if (!staff) return { ok: false, error: SIGNED_OUT_MESSAGE };

  const result = await recordManualTimeIn({
    schoolId: session.schoolId,
    studentId,
    staff: {
      id: staff.id,
      role: staff.role,
      advisoryGradeLevel: staff.advisoryGradeLevel,
      advisorySection: staff.advisorySection,
    },
    now: getNow(),
  });

  if (result.outcome === "not_found") return { ok: false, error: "That student isn't in a class you can record." };
  const studentName = `${result.student.firstName} ${result.student.lastName}`;
  if (result.outcome === "already_tapped") return { ok: false, error: `${studentName} already tapped in today.` };

  if (result.notified) wakePushWorker();
  // The tap is saved by now: a monitor that misses it mustn't make the
  // teacher think it failed (Step 55's code review).
  try {
    await publishStoredTap(result);
  } catch {
    console.error("attendance: a time in recorded by hand didn't reach the monitor");
  }
  refresh();
  return { ok: true, studentName, time: formatSchoolTime(result.tap.tappedAt) };
}

export type MarkAlertHandledActionResult = { ok: true } | { ok: false; error: string };

/**
 * "Mark handled" on a dashboard alert (Step 57). `markAlertHandled` holds
 * the rules (principals and super admins only, this school's alerts only);
 * `refresh()` then takes the alert off the page.
 */
export async function markAlertHandled(alertId: string): Promise<MarkAlertHandledActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: SIGNED_OUT_MESSAGE };
  if (!session.schoolId) return { ok: false, error: "Pick a school first." };

  const staff = await staffRepository.getById(session.userId);
  if (!staff) return { ok: false, error: SIGNED_OUT_MESSAGE };

  const result = await handleAlert({ schoolId: session.schoolId, alertId, role: staff.role });
  if (result === "not_allowed") return { ok: false, error: "Only a principal can mark alerts handled." };
  if (result === "not_found") return { ok: false, error: "That alert is no longer open." };
  refresh();
  return { ok: true };
}
