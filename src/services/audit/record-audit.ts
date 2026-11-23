import { auditRepository, type AuditRepository } from "@/data/repositories";
import type { Role } from "@/features/staff/types";
import { AUDIT_FIELDS, type AuditDetails, type AuditEventInput, type AuditField } from "@/features/audit/types";

/** How long the log is kept (Step 60.1). */
export const AUDIT_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const CLEAN_UP_EVERY_MS = 60 * 60 * 1000;
const CLEAN_UP_BATCH = 1000;

const ALLOWED_FIELDS: ReadonlySet<string> = new Set(AUDIT_FIELDS);

/**
 * Keeps only the field names on the list, once each. Anything else (a
 * value, a name, a typo) is dropped here, so the log can never hold what a
 * person typed. No fields at all means no details.
 */
export function cleanDetails(details: AuditEventInput["details"]): AuditDetails | undefined {
  const fields = [...new Set((details?.fields ?? []).filter((field) => ALLOWED_FIELDS.has(field)))] as AuditField[];
  return fields.length > 0 ? { fields } : undefined;
}

/** The actor an event names, from the session. */
export function actorOf(session: { userId: string; role: Role }) {
  return { id: session.userId, role: session.role };
}

type Deps = { audit: Pick<AuditRepository, "record" | "deleteOlderThan">; now: () => number };

const defaultDeps: Deps = { audit: auditRepository, now: () => Date.now() };

let lastCleanUpAt = Number.NEGATIVE_INFINITY;

/** For tests: forgets when the cleanup last ran. */
export function resetAuditCleanUp(): void {
  lastCleanUpAt = Number.NEGATIVE_INFINITY;
}

/**
 * Writes one event to the log after the change it describes has succeeded.
 * It is best-effort on purpose: a failed write is a warning with no names in
 * it, and never stops a school's work. (The two events that must not be
 * lost, removing a parent and deleting a student, are written inside their
 * own database transaction instead.)
 *
 * Also the log's retention: at most once an hour, per server, it deletes a
 * batch of events older than two years. It runs on writes because writes are
 * what grow the table; a restart only means it runs once more, and deleting
 * is safe to repeat. The `createdAt` index finds the rows.
 */
export async function recordAudit(event: AuditEventInput, deps: Deps = defaultDeps): Promise<void> {
  try {
    await deps.audit.record({
      schoolId: event.schoolId,
      actor: event.actor,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      details: cleanDetails(event.details),
    });
  } catch {
    console.warn("audit: an event could not be written");
    return;
  }

  const now = deps.now();
  if (now - lastCleanUpAt < CLEAN_UP_EVERY_MS) return;
  lastCleanUpAt = now;
  try {
    await deps.audit.deleteOlderThan(new Date(now - AUDIT_RETENTION_MS).toISOString(), CLEAN_UP_BATCH);
  } catch {
    console.warn("audit: the old events could not be cleaned up");
  }
}
