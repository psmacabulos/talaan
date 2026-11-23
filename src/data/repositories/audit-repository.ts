import type {
  AuditAction,
  AuditCursor,
  AuditEvent,
  AuditActor,
  AuditDetails,
  AuditTarget,
} from "@/features/audit/types";

/** An event ready to store: the service has already cleaned `details`. */
export type NewAuditEvent = {
  schoolId: string;
  actor: AuditActor;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: string;
  details?: AuditDetails;
};

/**
 * Who did what to a school's student data (Step 60.1). Only Postgres keeps
 * it, so there's no mock: the log has to outlive a restart, and every
 * caller needs the real thing to be tested against.
 */
export interface AuditRepository {
  record(event: NewAuditEvent): Promise<void>;
  /**
   * One page of `schoolId`'s events, newest first. `actions` limits the
   * kinds (null: all); `before` is the last row of the page before, and
   * `limit` rows are returned (the caller asks for one extra to know
   * whether there's a next page).
   */
  listPage(
    schoolId: string,
    options: { actions: readonly AuditAction[] | null; before: AuditCursor | null; limit: number },
  ): Promise<AuditEvent[]>;
  /** Deletes up to `limit` events older than `before`, across every school, and says how many. */
  deleteOlderThan(before: string, limit: number): Promise<number>;
}
