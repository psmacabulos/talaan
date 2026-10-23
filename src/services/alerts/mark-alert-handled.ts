import { z } from "zod";
import { alertRepository, type AlertRepository } from "@/data/repositories";
import type { Role } from "@/features/staff/types";

export type MarkAlertHandledInput = {
  /** The signed-in staff member's school: the alert must be in it. */
  schoolId: string;
  alertId: string;
  role: Role;
};

export type MarkAlertHandledResult = "handled" | "not_allowed" | "not_found";

// A uuid, or a seeded id like "alert-0001": anything else isn't an alert's.
const alertIdSchema = z.string().min(1).max(64);

/**
 * "Mark handled" on a dashboard alert (Step 57). Principals and super
 * admins only, the people who see "Needs attention"; a teacher never
 * reaches the database. An alert someone else already handled still
 * answers "handled", so two principals clicking at once both see it done.
 */
export async function markAlertHandled(
  input: MarkAlertHandledInput,
  deps: { alerts: Pick<AlertRepository, "acknowledge"> } = { alerts: alertRepository },
): Promise<MarkAlertHandledResult> {
  if (input.role !== "principal" && input.role !== "super_admin") return "not_allowed";
  const alertId = alertIdSchema.safeParse(input.alertId);
  if (!alertId.success) return "not_found";
  return (await deps.alerts.acknowledge(input.schoolId, alertId.data)) ? "handled" : "not_found";
}
