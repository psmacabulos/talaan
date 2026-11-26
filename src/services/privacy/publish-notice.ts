import { privacyNoticeRepository, type PrivacyNoticeRepository } from "@/data/repositories";
import { publishNoticeSchema } from "@/features/privacy/notice-schema";
import type { Role } from "@/features/staff/types";
import { actorOf } from "@/services/audit/record-audit";

/** What the caller's session says: who, which role, and which school (null for a super admin with none open). */
export type NoticeSession = { userId: string; role: Role; schoolId: string | null };

export type PublishNoticeResult =
  | { ok: true; version: number }
  | { ok: false; code: "not_allowed" | "stale" }
  | { ok: false; code: "invalid"; message: string }
  | { ok: false; code: "same_text"; version: number };

export type PublishNoticeDeps = { notices: Pick<PrivacyNoticeRepository, "current" | "publish"> };

/**
 * Publishes the next version of a school's privacy notice (Step 60.4). Only
 * a principal, or a super admin with the school open (for a busy principal,
 * with their approval given outside the app); never a teacher. The school
 * is always the session's. The wording is checked again here, since anyone
 * can call a server action. Who published it is written with the notice,
 * in its transaction.
 */
export async function publishNotice(
  session: NoticeSession,
  input: unknown,
  deps: PublishNoticeDeps = { notices: privacyNoticeRepository },
): Promise<PublishNoticeResult> {
  const schoolId = session.role === "teacher" ? null : session.schoolId;
  if (!schoolId) return { ok: false, code: "not_allowed" };

  const parsed = publishNoticeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Check the notice's wording." };
  }
  const { body, basedOnVersion } = parsed.data;

  const current = await deps.notices.current(schoolId);
  if ((current?.version ?? 0) !== basedOnVersion) return { ok: false, code: "stale" };
  // The same words again would ask every parent to accept them again for nothing.
  if (current && current.body === body) return { ok: false, code: "same_text", version: current.version };

  const outcome = await deps.notices.publish(schoolId, body, basedOnVersion, actorOf(session));
  return outcome.ok ? { ok: true, version: outcome.version } : { ok: false, code: "stale" };
}
