import { describe, expect, it } from "vitest";
import { alertSchema, tapSchema } from "./schemas";

describe("tapSchema", () => {
  const validTap = {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    schoolId: "school-balanga",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: "student-0001",
    tappedAt: "2026-06-01T07:58:00Z",
  };

  it("accepts a valid tap with a known student", () => {
    expect(tapSchema.safeParse(validTap).success).toBe(true);
  });

  it("accepts a tap with an unknown card (studentId is null)", () => {
    expect(tapSchema.safeParse({ ...validTap, studentId: null }).success).toBe(true);
  });

  it("rejects an id that isn't a UUID (taps are deduplicated by this id)", () => {
    expect(tapSchema.safeParse({ ...validTap, id: "tap-1" }).success).toBe(false);
  });

  it("rejects an invalid card serial", () => {
    expect(tapSchema.safeParse({ ...validTap, cardSerial: "not-a-serial" }).success).toBe(false);
  });
});

describe("alertSchema", () => {
  it("accepts a lost-card alert", () => {
    const result = alertSchema.safeParse({
      id: "alert-0001",
      schoolId: "school-balanga",
      tapId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      type: "lost_card_tapped",
      createdAt: "2026-06-01T07:58:00Z",
      acknowledged: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown alert type", () => {
    const result = alertSchema.safeParse({
      id: "alert-0001",
      schoolId: "school-balanga",
      tapId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      type: "duplicate_tap",
      createdAt: "2026-06-01T07:58:00Z",
      acknowledged: false,
    });
    expect(result.success).toBe(false);
  });
});
