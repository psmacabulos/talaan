import type { Notification, NotificationKind } from "@/features/parents/types";
import type { NotificationPreference } from "@/features/schools/types";
import type { NotificationRepository } from "@/data/repositories/notification-repository";
import type { SchoolRepository } from "@/data/repositories/school-repository";
import type { TapRepository } from "@/data/repositories/tap-repository";
import type { Tap } from "./types";
import { deriveTapKind } from "./status";

export type NotifyParentsDeps = {
  schoolRepository: SchoolRepository;
  tapRepository: TapRepository;
  notificationRepository: NotificationRepository;
};

/**
 * The school's one setting decides which taps reach parents: `off` sends
 * nothing, `time_in_only` only arrivals, `time_in_and_time_out` both.
 * Shared by this function and the gate's tap service (Step 45), so the two
 * can never disagree about who gets notified.
 */
export function shouldNotifyParents(preference: NotificationPreference, kind: NotificationKind): boolean {
  if (preference === "off") return false;
  return kind === "time_in" || preference === "time_in_and_time_out";
}

/**
 * Turns a freshly recorded tap into a parent notification (Step 24), or
 * into nothing, depending on the school's `notificationPreference`:
 *
 * - `off` — no notification at all.
 * - `time_in_only` — only time-ins fire; a time-out tap is skipped.
 * - `time_in_and_time_out` — both fire.
 *
 * One notification is created per tap — not per parent — and every
 * guardian of that student sees it by joining through their
 * `ParentStudentLink`s. Read state is therefore shared between guardians
 * of the same child, which is Step 20's approved model for Phase 1
 * (per-parent read state arrives with Phase 2's real database).
 *
 * Written as a flat copy of the tap's data at the moment it fires
 * (`features/parents/schemas.ts` documents why there's no `tapId`), so
 * callers invoke this right after the tap itself is persisted: the
 * station's `syncStationTaps` (valid taps only; a lost-card tap raises an
 * alert instead, and an unknown-card tap has nobody to notify). The gate
 * and a time in recorded by hand (Step 55) write their notification in the
 * same transaction as the tap instead, deciding with `shouldNotifyParents`.
 *
 * Repositories come in as parameters rather than importing the singletons,
 * so tests can hand it fresh mock instances — the same pattern
 * `lib/session.ts`'s `resolveSession(staffId, repository)` uses.
 */
export async function notifyParentsForTap(tap: Tap, deps: NotifyParentsDeps): Promise<Notification | null> {
  if (!tap.studentId) return null;

  const school = await deps.schoolRepository.getById(tap.schoolId);
  if (!school) return null;

  const studentTaps = await deps.tapRepository.listByStudent(tap.schoolId, tap.studentId);
  const kind = deriveTapKind(tap, studentTaps);
  if (!shouldNotifyParents(school.notificationPreference, kind)) return null;

  return deps.notificationRepository.create({
    id: crypto.randomUUID(),
    schoolId: tap.schoolId,
    studentId: tap.studentId,
    kind,
    tappedAt: tap.tappedAt,
    read: false,
  });
}
