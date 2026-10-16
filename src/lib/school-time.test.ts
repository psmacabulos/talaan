import { describe, expect, it } from "vitest";
import {
  formatSchoolDate,
  formatSchoolTime,
  isWeekend,
  minutesFromClockTime,
  nextDate,
  schoolDateOf,
  schoolMinutesOf,
  schoolTimeToIso,
  toSchoolOffsetIso,
} from "./school-time";

describe("schoolTimeToIso", () => {
  it("turns a time on the school's clock into the real instant, 8 hours earlier", () => {
    expect(schoolTimeToIso("2026-06-20", "07:56")).toBe("2026-06-19T23:56:00.000Z");
    expect(schoolTimeToIso("2026-06-20", "16:05")).toBe("2026-06-20T08:05:00.000Z");
  });
});

describe("schoolDateOf / schoolMinutesOf", () => {
  it("puts an early-morning tap on the school's day, though it's the day before in UTC", () => {
    const tap = "2026-06-19T23:56:00.000Z";
    expect(schoolDateOf(tap)).toBe("2026-06-20");
    expect(schoolMinutesOf(tap)).toBe(7 * 60 + 56);
  });

  it("splits the school's days at its own midnight", () => {
    expect(schoolDateOf(schoolTimeToIso("2026-06-20", "23:59"))).toBe("2026-06-20");
    expect(schoolDateOf(schoolTimeToIso("2026-06-21", "00:00"))).toBe("2026-06-21");
  });

  it("round-trips any time of day", () => {
    const iso = schoolTimeToIso("2026-12-31", "18:30");
    expect(schoolDateOf(iso)).toBe("2026-12-31");
    expect(schoolMinutesOf(iso)).toBe(18 * 60 + 30);
  });
});

describe("minutesFromClockTime", () => {
  it("reads HH:MM", () => {
    expect(minutesFromClockTime("08:05")).toBe(485);
    expect(minutesFromClockTime("00:00")).toBe(0);
  });
});

describe("nextDate", () => {
  it("rolls over months and years", () => {
    expect(nextDate("2026-06-30")).toBe("2026-07-01");
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });
});

describe("formatSchoolTime", () => {
  it("formats the school's clock time with AM/PM", () => {
    expect(formatSchoolTime(schoolTimeToIso("2026-06-20", "07:56"))).toBe("7:56 AM");
    expect(formatSchoolTime(schoolTimeToIso("2026-06-20", "12:00"))).toBe("12:00 PM");
    expect(formatSchoolTime(schoolTimeToIso("2026-06-20", "00:05"))).toBe("12:05 AM");
    expect(formatSchoolTime(schoolTimeToIso("2026-06-20", "14:30"))).toBe("2:30 PM");
  });
});

describe("isWeekend", () => {
  it("is true on Saturday and Sunday only", () => {
    expect(isWeekend("2026-06-19")).toBe(false); // Friday
    expect(isWeekend("2026-06-20")).toBe(true); // Saturday
    expect(isWeekend("2026-06-21")).toBe(true); // Sunday
    expect(isWeekend("2026-06-22")).toBe(false); // Monday
  });
});

describe("formatSchoolDate", () => {
  it("names the school's calendar date", () => {
    expect(formatSchoolDate("2026-06-19T23:56:00.000Z")).toBe("June 20, 2026");
  });
});

describe("toSchoolOffsetIso", () => {
  it("writes the same instant on the school's clock, with its offset", () => {
    expect(toSchoolOffsetIso("2026-10-13T07:56:00.000Z")).toBe("2026-10-13T15:56:00.000+08:00");
    expect(toSchoolOffsetIso("2026-10-13T16:30:00.000Z")).toBe("2026-10-14T00:30:00.000+08:00");
    expect(Date.parse(toSchoolOffsetIso("2026-10-13T07:56:00.123Z"))).toBe(Date.parse("2026-10-13T07:56:00.123Z"));
  });
});
