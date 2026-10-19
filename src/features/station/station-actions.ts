"use server";

import { refresh } from "next/cache";
import {
  alertRepository,
  notificationRepository,
  schoolRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getSession } from "@/lib/session";
import { notifyParentsForTap } from "@/features/attendance/notify-parents";
import { wakePushWorker } from "@/services/push/push-worker";
import type { StationTapOutcome } from "./resolve-station-tap";

/** The signed-in school, or an error for anyone who can't use the tap station. */
async function stationSchoolId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error(SIGNED_OUT_MESSAGE);
  if (!session.schoolId || session.role === "teacher") {
    throw new Error("You don't have permission to use the tap station.");
  }
  return session.schoolId;
}

/**
 * Persists tap station outcomes the kiosk has already resolved on its own
 * (`resolve-station-tap.ts`, run client-side in `tap-station-kiosk.tsx`) —
 * this action never re-resolves anything itself, it only writes down what
 * the device already decided. That's deliberately the same call whether
 * it's handed one outcome (an online tap, persisted right away) or several
 * at once (an offline queue, persisted together once connectivity
 * returns) — matching CLAUDE.md's own description of how a real station
 * works: "a tap made while offline is generated and queued on the device
 * itself... they reach the server, and only then can a notification go
 * out, once connectivity returns."
 */
export async function syncStationTaps(outcomes: StationTapOutcome[]): Promise<{ synced: number }> {
  const schoolId = await stationSchoolId();

  let synced = 0;
  let notified = false;
  for (const outcome of outcomes) {
    if (outcome.status !== "recorded") continue;
    // The browser resolved this tap, so its contents are only a claim
    // (Step 51): a tap for another school, or naming a student who isn't
    // this school's, is dropped instead of written into that school's day.
    if (outcome.tap.schoolId !== schoolId) continue;
    if (outcome.tap.studentId && !(await studentRepository.getInSchool(schoolId, outcome.tap.studentId))) continue;

    await tapRepository.create(outcome.tap);
    if (outcome.kind === "valid") {
      // Only a valid tap notifies parents (Step 24). A lost-card tap raises
      // the alert below instead — pinging parents about it would read as a
      // normal arrival — and an unknown-card tap has no student to notify.
      const notification = await notifyParentsForTap(outcome.tap, {
        schoolRepository,
        tapRepository,
        notificationRepository,
      });
      if (notification) notified = true;
    }
    if (outcome.kind === "lost") {
      await alertRepository.create({
        id: outcome.alert.id,
        schoolId: outcome.tap.schoolId,
        tapId: outcome.alert.tapId,
        type: "lost_card_tapped",
        createdAt: outcome.alert.createdAt,
        acknowledged: false,
      });
    }
    synced++;
  }

  // One wake for the whole batch: the pushes go now (Step 54).
  if (notified) wakePushWorker();
  if (synced > 0) refresh();
  return { synced };
}
