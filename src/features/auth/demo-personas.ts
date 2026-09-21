/**
 * The three seeded staff ids Phase 1 signs in as (src/data/seed/staff.ts).
 * Shared by the main sign-in form (always the principal, matching the
 * prototype's main "Sign in" button) and the "Try the prototype as"
 * shortcuts below it.
 */
export const DEMO_PERSONAS = [
  { role: "principal", label: "Principal", staffId: "staff-principal-school-balanga" },
  { role: "teacher", label: "Teacher", staffId: "staff-teacher-school-balanga" },
  { role: "super_admin", label: "Super admin", staffId: "staff-0001" },
] as const;

export const DEFAULT_SIGN_IN_STAFF_ID = DEMO_PERSONAS[0].staffId;
