import { describe, expect, it } from "vitest";
import { cardSchema, cardSerialSchema, gradeLevelSchema, lrnSchema, phMobileSchema, studentSchema } from "./schemas";

const validStudent = {
  id: "student-0001",
  schoolId: "school-balanga",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-14",
  gradeLevel: 8,
  section: "Rizal",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

describe("studentSchema", () => {
  it("accepts a valid student without an LRN or middle name (both optional)", () => {
    expect(studentSchema.safeParse(validStudent).success).toBe(true);
  });

  it("accepts a valid 12-digit LRN", () => {
    const result = studentSchema.safeParse({ ...validStudent, lrn: "123456789012" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid photo URL, and rejects a non-URL string", () => {
    expect(
      studentSchema.safeParse({ ...validStudent, photoUrl: "https://example.com/photo.jpg" }).success,
    ).toBe(true);
    expect(studentSchema.safeParse({ ...validStudent, photoUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects an LRN that isn't exactly 12 digits", () => {
    expect(lrnSchema.safeParse("12345").success).toBe(false);
    expect(lrnSchema.safeParse("1234567890123").success).toBe(false);
    expect(lrnSchema.safeParse("12345678901a").success).toBe(false);
  });

  it("rejects a grade level outside 7-12", () => {
    expect(gradeLevelSchema.safeParse(6).success).toBe(false);
    expect(gradeLevelSchema.safeParse(13).success).toBe(false);
    expect(gradeLevelSchema.safeParse(9).success).toBe(true);
  });

  it("rejects a birth date that isn't a plain calendar date", () => {
    expect(studentSchema.safeParse({ ...validStudent, birthDate: "not a date" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...validStudent, birthDate: "2012-03-14T00:00:00Z" }).success).toBe(
      false,
    );
  });

  it("rejects a guardian mobile number that isn't a valid PH format", () => {
    expect(phMobileSchema.safeParse("09171234567").success).toBe(true);
    expect(phMobileSchema.safeParse("+639171234567").success).toBe(true);
    expect(phMobileSchema.safeParse("123456").success).toBe(false);
    expect(phMobileSchema.safeParse("08171234567").success).toBe(false);
  });
});

describe("cardSerialSchema", () => {
  it("accepts the CLAUDE.md example serial", () => {
    expect(cardSerialSchema.safeParse("04:A3:5F:2B:91:C0:80").success).toBe(true);
  });

  it("rejects lowercase hex", () => {
    expect(cardSerialSchema.safeParse("04:a3:5f:2b:91:c0:80").success).toBe(false);
  });

  it("rejects a serial with no colons", () => {
    expect(cardSerialSchema.safeParse("04A35F2B91C080").success).toBe(false);
  });
});

describe("cardSchema", () => {
  it("accepts a valid card", () => {
    const result = cardSchema.safeParse({
      id: "card-0001",
      schoolId: "school-balanga",
      studentId: "student-0001",
      serial: "04:A3:5F:2B:91:C0:80",
      status: "active",
      linkedAt: "2026-06-01T08:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    const result = cardSchema.safeParse({
      id: "card-0001",
      schoolId: "school-balanga",
      studentId: "student-0001",
      serial: "04:A3:5F:2B:91:C0:80",
      status: "stolen",
      linkedAt: "2026-06-01T08:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
