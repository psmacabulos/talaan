import { describe, expect, it } from "vitest";
import { appUrl, checkProductionEnv, isLiveServer, releaseCheck } from "./env";

const GOOD: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  SESSION_SECRET: "x".repeat(32),
  DATABASE_URL: "postgresql://user:pass@db.example:5432/talaan",
  PHOTO_STORAGE: "s3",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_BUCKET: "talaan-photos",
  S3_ACCESS_KEY_ID: "key-id",
  S3_SECRET_ACCESS_KEY: "key-secret",
  PUSH_SENDER: "expo",
  EXPO_ACCESS_TOKEN: "expo-token",
  EMAIL_SENDER: "smtp",
  SMTP_HOST: "smtp.resend.com",
  SMTP_PORT: "465",
  SMTP_USER: "resend",
  SMTP_PASSWORD: "re_secret",
  EMAIL_FROM: "Bantay Aral <no-reply@mail.bantayaral.com>",
  APP_URL: "https://bantayaral.herokuapp.com",
};

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

  it("asks whether pushes really go out, and for Expo's access token when they do", () => {
    expect(checkProductionEnv({ ...GOOD, PUSH_SENDER: "log", EXPO_ACCESS_TOKEN: undefined })).toEqual([]);
    expect(checkProductionEnv({ ...GOOD, PUSH_SENDER: undefined })).toEqual([
      expect.stringMatching(/^PUSH_SENDER must be/),
    ]);
    expect(checkProductionEnv({ ...GOOD, PUSH_SENDER: "fcm" })).toHaveLength(1);
    expect(checkProductionEnv({ ...GOOD, EXPO_ACCESS_TOKEN: "" })).toEqual([
      expect.stringMatching(/needs EXPO_ACCESS_TOKEN/),
    ]);
  });

  it("asks whether emails really go out, and for every SMTP setting when they do (Step 55.5)", () => {
    expect(checkProductionEnv({ ...GOOD, EMAIL_SENDER: "log", SMTP_HOST: undefined, APP_URL: undefined })).toEqual([]);
    expect(checkProductionEnv({ ...GOOD, EMAIL_SENDER: undefined })).toEqual([
      expect.stringMatching(/^EMAIL_SENDER must be/),
    ]);
    expect(checkProductionEnv({ ...GOOD, EMAIL_SENDER: "resend" })).toHaveLength(1);
    expect(checkProductionEnv({ ...GOOD, SMTP_PASSWORD: "", APP_URL: undefined })).toEqual([
      'EMAIL_SENDER="smtp" needs SMTP_PASSWORD, APP_URL.',
    ]);
  });

  it("refuses links in emails that aren't https", () => {
    expect(checkProductionEnv({ ...GOOD, APP_URL: "http://bantayaral.herokuapp.com" })).toEqual([
      "APP_URL must start with https://.",
    ]);
  });

  it("refuses an SMTP port that isn't a number", () => {
    expect(checkProductionEnv({ ...GOOD, SMTP_PORT: "smtp" })).toEqual([
      "SMTP_PORT must be a port number, such as 465.",
    ]);
  });

  it("never repeats a setting's value", () => {
    const problems = checkProductionEnv({ ...GOOD, SESSION_SECRET: "leaky-secret", DEMO_NOW: "leaky-date" });
    expect(problems.join(" ")).not.toMatch(/leaky/);
  });
});

describe("isLiveServer", () => {
  it("is a production server, except the browser tests' own", () => {
    expect(isLiveServer({ NODE_ENV: "production" })).toBe(true);
    expect(isLiveServer({ NODE_ENV: "production", E2E: "1" })).toBe(false);
    expect(isLiveServer({ NODE_ENV: "development" })).toBe(false);
    // E2E set on Heroku by mistake changes nothing.
    expect(isLiveServer({ NODE_ENV: "production", E2E: "1", DYNO: "web.1" })).toBe(true);
  });
});

describe("appUrl", () => {
  it("is APP_URL without a trailing slash, or the development address", () => {
    expect(appUrl({ NODE_ENV: "production", APP_URL: "https://bantayaral.herokuapp.com/" })).toBe(
      "https://bantayaral.herokuapp.com",
    );
    expect(appUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
  });
});

describe("releaseCheck (Step 59: Heroku's release phase)", () => {
  it("lets a complete setup through", () => {
    expect(releaseCheck(GOOD)).toEqual({ exitCode: 0, lines: ["Settings OK."] });
  });

  it("refuses a release missing a setting, naming it and never a value", () => {
    const { exitCode, lines } = releaseCheck({ ...GOOD, EMAIL_SENDER: undefined, SMTP_PASSWORD: "re_secret" });
    expect(exitCode).toBe(1);
    expect(lines[0]).toMatch(/^This release is refused/);
    expect(lines.slice(1)).toEqual([expect.stringMatching(/^- EMAIL_SENDER must be/)]);
    expect(lines.join("\n")).not.toContain("re_secret");
  });
});
