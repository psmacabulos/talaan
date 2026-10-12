/** The three seeded staff accounts the development-only "Try the prototype as" buttons sign in as (src/data/seed/staff.ts). */
export const DEMO_PERSONAS = [
  { role: "principal", label: "Principal", staffId: "staff-principal-school-balanga" },
  { role: "teacher", label: "Teacher", staffId: "staff-teacher-school-balanga" },
  { role: "super_admin", label: "Super admin", staffId: "staff-0001" },
] as const;
