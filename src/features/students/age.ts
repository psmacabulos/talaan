/**
 * Age in whole years from a stored birth date (CLAUDE.md: show age, never
 * store it), as of `today`, a "YYYY-MM-DD" date on the school's clock. The
 * page passes its own today (src/lib/clock.ts), so every age on a page
 * agrees with that page's attendance, including under a pinned demo clock.
 */
export function ageInYears(birthDate: string, today: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);

  const hasHadBirthdayThisYear = month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (hasHadBirthdayThisYear ? 0 : 1);
}
