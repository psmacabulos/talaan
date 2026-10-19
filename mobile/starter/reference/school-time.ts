/**
 * How Talaan shows times on the school's clock, whatever the device's time
 * zone. Copied on 2026-10-19 from Talaan's src/lib/school-time.ts (the parts
 * the app needs), as a reference for the app's own helper with its own tests.
 *
 * Every school is in the Philippines: UTC+8 all year, no daylight saving. The
 * API sends times like "2026-10-13T07:56:00.000+08:00". Date.parse reads the
 * offset, so the instant is right; moving it 8 hours forward and reading the
 * UTC fields gives the school's own clock, with no Intl time zone support
 * needed (which varies between phones). Never use toLocaleTimeString or
 * toLocaleDateString for these: they use the phone's zone.
 */
const SCHOOL_UTC_OFFSET_MINUTES = 8 * 60;
const MINUTE_MS = 60_000;

/** The instant moved onto the school's clock, so the UTC getters read school time. */
function onSchoolClock(iso: string): Date {
  return new Date(Date.parse(iso) + SCHOOL_UTC_OFFSET_MINUTES * MINUTE_MS);
}

/** The school's calendar date at that instant: "2026-06-20". */
export function schoolDateOf(iso: string): string {
  return onSchoolClock(iso).toISOString().slice(0, 10);
}

/** "7:56 AM" on the school's clock. */
export function formatSchoolTime(iso: string): string {
  const clock = onSchoolClock(iso);
  const hours24 = clock.getUTCHours();
  const minutes = clock.getUTCMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Saturday or Sunday, for a school calendar date ("2026-06-20" is a Saturday).
 * The API already says this as `flexible`; this is for labelling dates only.
 */
export function isWeekend(date: string): boolean {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** The weekday of a school calendar date, 0 (Sunday) to 6: index the app's own day names with it. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The month of a school calendar date, 0 (January) to 11: index the app's own month names with it. */
export function monthOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCMonth();
}
