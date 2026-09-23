"use server";

import { refresh } from "next/cache";
import { alertRepository, tapRepository, schoolRepository, notificationRepository } from "@/data/repositories";
import { getSession } from "@/lib/session";
import { notifyParentsForTap } from "@/features/attendance/notify-parents";
import type { StationTapOutcome } from "./resolve-station-tap";

async function assertStationAccess(): Promise<void> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    throw new Error("You don't have permission to use the tap station.");
  }
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
  await assertStationAccess();

  let synced = 0;
  for (const outcome of outcomes) {
    if (outcome.status !== "recorded") continue;

    await tapRepository.create(outcome.tap);
    if (outcome.kind === "valid") {
      // Only a valid tap notifies parents (Step 24). A lost-card tap raises
      // the alert below instead — pinging parents about it would read as a
      // normal arrival — and an unknown-card tap has no student to notify.
      await notifyParentsForTap(outcome.tap, {
        schoolRepository,
        tapRepository,
        notificationRepository,
      });
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

  if (synced > 0) refresh();
  return { synced };
}
