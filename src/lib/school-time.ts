/**
 * Every school is in the Philippines: UTC+8 all year, no daylight saving.
 * Times are stored as real instants (UTC), and turned into the school's
 * own date and clock time only here, when something is shown or compared.
 * If a school outside the Philippines ever joins, this is the one file
 * that changes.
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

/** Minutes since the school's midnight: 7:56 AM is 476. */
export function schoolMinutesOf(iso: string): number {
  const clock = onSchoolClock(iso);
  return clock.getUTCHours() * 60 + clock.getUTCMinutes();
}

/** "08:05" → 485. */
export function minutesFromClockTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** The real instant for a date and clock time at the school: ("2026-06-20", "07:56") → "2026-06-19T23:56:00.000Z". */
export function schoolTimeToIso(date: string, time: string): string {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  return new Date(midnight + (minutesFromClockTime(time) - SCHOOL_UTC_OFFSET_MINUTES) * MINUTE_MS).toISOString();
}

/** The calendar date after `date`: "2026-06-30" → "2026-07-01". */
export function nextDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 24 * 60 * MINUTE_MS).toISOString().slice(0, 10);
}

/**
 * Saturday or Sunday, for a school calendar date ("2026-06-20" is a
 * Saturday). `date` is already the school's own date, so it's read at
 * midnight UTC, which gives back that same date on any server.
 */
export function isWeekend(date: string): boolean {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** "7:56 AM" on the school's clock. */
export function formatSchoolTime(iso: string): string {
  const minutesOfDay = schoolMinutesOf(iso);
  const hours24 = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** "June 20, 2026": the school's calendar date. */
export function formatSchoolDate(iso: string): string {
  return onSchoolClock(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
