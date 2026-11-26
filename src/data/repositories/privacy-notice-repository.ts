import type { AuditActor } from "@/features/audit/types";
import type { NoticeVersion, PrivacyNotice } from "@/features/privacy/types";

export type PublishNoticeOutcome = { ok: true; version: number } | { ok: false; reason: "stale" };

/**
 * A school's privacy notice and its versions (Step 60.4). Postgres only,
 * like the audit repository: publishing writes the notice and its Activity
 * event in one transaction, which a mock couldn't show.
 */
export interface PrivacyNoticeRepository {
  /** The school's newest version, or null when it has published none. */
  current(schoolId: string): Promise<PrivacyNotice | null>;
  /** Every version's number and date, newest first, without the text. */
  versions(schoolId: string): Promise<NoticeVersion[]>;
  /**
   * Adds version `basedOnVersion + 1` and its `privacy_notice_published`
   * event, together. "stale" when the school's newest version isn't
   * `basedOnVersion` (someone published meanwhile, or the number is made
   * up); nothing is written then.
   */
  publish(schoolId: string, body: string, basedOnVersion: number, actor: AuditActor): Promise<PublishNoticeOutcome>;
}
