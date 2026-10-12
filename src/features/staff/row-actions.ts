import type { Staff } from "./types";

export type StaffRowActions = { canMakeLink: boolean; canRemove: boolean };

/**
 * Which ⋮ menu actions one staff row offers (Step 27.6). Shared by the menu
 * (to decide what to show) and the server actions (to refuse anything the
 * menu wouldn't have offered), so the two can't drift apart.
 *
 * - A sign-in link (Step 50.5): "Copy sign-in link" for an invited account,
 *   "Copy password reset link" for an active one. Never for the signed-in
 *   person themselves, who is already in.
 * - Remove: anyone at the school except the signed-in person themselves,
 *   so a principal can't lock themselves out by accident.
 */
export function staffRowActions(staff: Staff, currentUserId: string): StaffRowActions {
  const isSelf = staff.id === currentUserId;
  return { canMakeLink: !isSelf, canRemove: !isSelf };
}
