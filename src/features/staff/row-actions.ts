import type { Staff } from "./types";

export type StaffRowActions = { canResend: boolean; canRemove: boolean };

/**
 * Which ⋮ menu actions one staff row offers (Step 27.6). Shared by the menu
 * (to decide what to show) and the server actions (to refuse anything the
 * menu wouldn't have offered), so the two can't drift apart.
 *
 * - Resend invitation: only while the invite hasn't been accepted yet.
 * - Remove: anyone at the school except the signed-in person themselves,
 *   so a principal can't lock themselves out by accident.
 */
export function staffRowActions(staff: Staff, currentUserId: string): StaffRowActions {
  return {
    canResend: staff.status === "invited",
    canRemove: staff.id !== currentUserId,
  };
}
