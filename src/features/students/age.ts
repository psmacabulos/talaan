import { DASHBOARD_NOW } from "@/features/attendance/status";

/**
 * Age in whole years from a stored birth date (CLAUDE.md: show age, never
 * store it). Defaults `now` to the same fixed "today" the rest of the demo
 * already agrees on (src/features/attendance/status.ts's DASHBOARD_NOW), so
 * displayed ages don't quietly change depending on the real calendar date.
 */
export function ageInYears(birthDate: string, now: string = DASHBOARD_NOW): number {
  const birth = new Date(birthDate);
  const today = new Date(now);

  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}
