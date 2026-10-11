import { DEFAULT_ATTENDANCE_TIMES } from "@/features/attendance/status";
import type { School } from "@/features/schools/types";

/**
 * 3 schools: the real pilot (Balanga City NSHS, using the `school` preset
 * built from its own brand colors) plus two fictional demo schools on
 * different presets, so switching between them in the dev school switcher
 * (Step 11) visibly recolors the app. See CLAUDE.md's "two demo schools
 * with different colors."
 *
 * All three use the default 8:05 / 9:00 attendance times (Step 44.5), so
 * the demo morning's late and absent counts stay what the tests expect.
 */
export const seedSchools: School[] = [
  {
    id: "school-balanga",
    name: "Balanga City National Science High School",
    theme: { kind: "preset", presetId: "school" },
    showDepedLogo: false,
    // The pilot school wants the full notify-on-arrival-and-dismissal experience.
    notificationPreference: "time_in_and_time_out",
    ...DEFAULT_ATTENDANCE_TIMES,
  },
  {
    id: "school-oceanview",
    name: "Oceanview National High School",
    theme: { kind: "preset", presetId: "ocean" },
    showDepedLogo: false,
    notificationPreference: "time_in_only",
    ...DEFAULT_ATTENDANCE_TIMES,
  },
  {
    id: "school-crimsonridge",
    name: "Crimson Ridge National High School",
    theme: { kind: "preset", presetId: "crimson" },
    showDepedLogo: false,
    // Demonstrates a school that's turned notifications off entirely.
    notificationPreference: "off",
    ...DEFAULT_ATTENDANCE_TIMES,
  },
];
