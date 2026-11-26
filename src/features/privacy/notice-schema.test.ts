import { describe, expect, it } from "vitest";
import {
  NOTICE_MAX_LENGTH,
  NOTICE_MIN_LENGTH,
  normalizeNotice,
  noticeBodySchema,
  publishNoticeSchema,
} from "./notice-schema";

const LONG_ENOUGH = "x".repeat(NOTICE_MIN_LENGTH);

describe("the privacy notice's wording (Step 60.4)", () => {
  it("stores Windows and old Mac line endings as \\n, trims the ends, and keeps inner spacing", () => {
    expect(normalizeNotice("  One\r\nTwo\rThree   with  spaces \n\n")).toBe("One\nTwo\nThree   with  spaces");
  });

  it("accepts 200 to 20,000 characters after trimming", () => {
    expect(noticeBodySchema.safeParse(`  ${LONG_ENOUGH}  `)).toEqual({ success: true, data: LONG_ENOUGH });
    expect(noticeBodySchema.safeParse("x".repeat(NOTICE_MAX_LENGTH)).success).toBe(true);
  });

  it("refuses a notice that is too short once trimmed, or too long", () => {
    const short = noticeBodySchema.safeParse(` ${"x".repeat(NOTICE_MIN_LENGTH - 1)}          `);
    expect(short.success).toBe(false);
    expect(short.error?.issues[0]?.message).toMatch(/at least 200 characters/);

    const long = noticeBodySchema.safeParse("x".repeat(NOTICE_MAX_LENGTH + 1));
    expect(long.success).toBe(false);
    expect(long.error?.issues[0]?.message).toMatch(/20,000 characters/);
  });

  it("needs the version being edited as a whole number from 0", () => {
    expect(publishNoticeSchema.safeParse({ body: LONG_ENOUGH, basedOnVersion: 0 }).success).toBe(true);
    for (const basedOnVersion of [-1, 1.5, "2", null]) {
      expect(publishNoticeSchema.safeParse({ body: LONG_ENOUGH, basedOnVersion }).success).toBe(false);
    }
  });
});
