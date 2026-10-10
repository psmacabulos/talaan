import { describe, expect, it } from "vitest";
import { generateDeviceToken, hashDeviceToken, readBearerToken } from "./device-token";

describe("generateDeviceToken", () => {
  it("makes a long, prefixed, different token every time", () => {
    const first = generateDeviceToken();
    expect(first).toMatch(/^tal_dev_[A-Za-z0-9_-]{43}$/);
    expect(generateDeviceToken()).not.toBe(first);
  });
});

describe("hashDeviceToken", () => {
  it("gives the same hash for the same token, and never the token itself", () => {
    const hash = hashDeviceToken("tal_dev_abc");
    expect(hashDeviceToken("tal_dev_abc")).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDeviceToken("tal_dev_abd")).not.toBe(hash);
  });
});

describe("readBearerToken", () => {
  it("reads the token from a Bearer header", () => {
    expect(readBearerToken("Bearer tal_dev_abc")).toBe("tal_dev_abc");
    expect(readBearerToken("bearer tal_dev_abc")).toBe("tal_dev_abc");
  });

  it("returns null for anything else", () => {
    expect(readBearerToken(null)).toBeNull();
    expect(readBearerToken("tal_dev_abc")).toBeNull();
    expect(readBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(readBearerToken("Bearer ")).toBeNull();
  });
});
