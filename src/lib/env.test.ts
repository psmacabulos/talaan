import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "./env";

const GOOD = {
  SESSION_SECRET: "x".repeat(32),
  DATABASE_URL: "postgresql://user:pass@db.example:5432/talaan",
  PHOTO_STORAGE: "s3",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_BUCKET: "talaan-photos",
  S3_ACCESS_KEY_ID: "key-id",
  S3_SECRET_ACCESS_KEY: "key-secret",
} as NodeJS.ProcessEnv;

describe("checkProductionEnv", () => {
  it("finds nothing wrong with a complete live setup", () => {
    expect(checkProductionEnv(GOOD)).toEqual([]);
  });

  it("refuses a missing or short session secret", () => {
    expect(checkProductionEnv({ ...GOOD, SESSION_SECRET: undefined })).toEqual([
      expect.stringMatching(/^SESSION_SECRET is missing/),
    ]);
    expect(checkProductionEnv({ ...GOOD, SESSION_SECRET: "short" })).toHaveLength(1);
  });

  it("refuses a missing database address", () => {
    expect(checkProductionEnv({ ...GOOD, DATABASE_URL: "" })).toEqual(["DATABASE_URL is missing."]);
  });

  it("refuses photos on the server's own disk", () => {
    expect(checkProductionEnv({ ...GOOD, PHOTO_STORAGE: undefined })).toEqual([
      expect.stringMatching(/^PHOTO_STORAGE must be "s3"/),
    ]);
    expect(checkProductionEnv({ ...GOOD, PHOTO_STORAGE: "local" })).toHaveLength(1);
  });

  it("names every missing S3 setting", () => {
    expect(checkProductionEnv({ ...GOOD, S3_BUCKET: "", S3_SECRET_ACCESS_KEY: undefined })).toEqual([
      'PHOTO_STORAGE="s3" needs S3_BUCKET, S3_SECRET_ACCESS_KEY.',
    ]);
  });

  it("refuses a pinned demo clock", () => {
    expect(checkProductionEnv({ ...GOOD, DEMO_NOW: "2026-06-19T09:15:00+08:00" })).toEqual([
      expect.stringMatching(/^DEMO_NOW is set/),
    ]);
  });

  it("never repeats a setting's value", () => {
    const problems = checkProductionEnv({ ...GOOD, SESSION_SECRET: "leaky-secret", DEMO_NOW: "leaky-date" });
    expect(problems.join(" ")).not.toMatch(/leaky/);
  });
});
