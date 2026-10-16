import { describe, expect, it } from "vitest";
import { createMockParentTokenRepository } from "@/data/repositories/parent-token-repository";
import { createMockPushTokenRepository } from "@/data/repositories/push-token-repository";
import { registerPushToken, signOutParentPhone } from "./push-tokens";

const PHONE = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
const OTHER_PHONE = "ExpoPushToken[yyyyyyyyyyyyyyyyyyyyyy]";
const NOW = "2026-10-16T00:00:00.000Z";

const ana = { parentId: "parent-ana", tokenId: "token-ana" };
const ben = { parentId: "parent-ben", tokenId: "token-ben" };

function addresses(pushTokens: ReturnType<typeof createMockPushTokenRepository>) {
  return pushTokens.rows.map(({ token, platform, parentTokenId }) => ({ token, platform, parentTokenId }));
}

describe("registerPushToken", () => {
  it("saves a phone's Expo push token for its sign-in", async () => {
    const pushTokens = createMockPushTokenRepository();
    await expect(registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens })).resolves.toEqual({
      ok: true,
    });
    expect(addresses(pushTokens)).toEqual([{ token: PHONE, platform: "android", parentTokenId: "token-ana" }]);
  });

  it("writes nothing when the phone registers the same address again", async () => {
    const pushTokens = createMockPushTokenRepository();
    await registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens });
    const firstId = pushTokens.rows[0].id;
    await registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens });
    expect(pushTokens.rows).toHaveLength(1);
    expect(pushTokens.rows[0].id).toBe(firstId);
  });

  it("keeps one address per sign-in: a new address replaces the old", async () => {
    const pushTokens = createMockPushTokenRepository();
    await registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens });
    await registerPushToken(ana, { token: OTHER_PHONE, platform: "android" }, { pushTokens });
    expect(addresses(pushTokens)).toEqual([{ token: OTHER_PHONE, platform: "android", parentTokenId: "token-ana" }]);
  });

  it("moves a phone's address to whoever signed in on it last", async () => {
    const pushTokens = createMockPushTokenRepository();
    await registerPushToken(ana, { token: PHONE, platform: "ios" }, { pushTokens });
    await registerPushToken(ben, { token: PHONE, platform: "ios" }, { pushTokens });
    expect(addresses(pushTokens)).toEqual([{ token: PHONE, platform: "ios", parentTokenId: "token-ben" }]);
  });

  it("tries once more when another registration wrote at the same moment", async () => {
    const pushTokens = createMockPushTokenRepository();
    let clashes = 1;
    const clashingOnce = {
      ...pushTokens,
      replace: async (row: Parameters<typeof pushTokens.replace>[0]) =>
        clashes-- > 0 ? ("clash" as const) : pushTokens.replace(row),
    };
    await registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens: clashingOnce });
    expect(addresses(pushTokens)).toEqual([{ token: PHONE, platform: "android", parentTokenId: "token-ana" }]);
  });

  it("answers signed out when the sign-in was deleted on the way", async () => {
    const pushTokens = { ...createMockPushTokenRepository(), replace: async () => "signed_out" as const };
    await expect(registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens })).resolves.toEqual({
      ok: false,
      code: "unauthorized",
    });
  });

  it("refuses anything that isn't an Expo push token, or another platform", async () => {
    const pushTokens = createMockPushTokenRepository();
    const result = await registerPushToken(ana, { token: "fcm:abc", platform: "web" }, { pushTokens });
    expect(result).toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { token: "Send the phone's Expo push token", platform: "Use ios or android" },
    });
    const tooLong = `ExpoPushToken[${"a".repeat(200)}]`;
    expect((await registerPushToken(ana, { token: tooLong, platform: "ios" }, { pushTokens })).ok).toBe(false);
    expect(pushTokens.rows).toEqual([]);
  });
});

describe("signOutParentPhone", () => {
  it("removes that phone's push address and revokes its token, and leaves other phones alone", async () => {
    const pushTokens = createMockPushTokenRepository();
    const tokens = createMockParentTokenRepository();
    await tokens.create({ id: "token-ana", parentId: "parent-ana", label: null }, "hash-ana", NOW);
    await registerPushToken(ana, { token: PHONE, platform: "android" }, { pushTokens });
    await registerPushToken(ben, { token: OTHER_PHONE, platform: "android" }, { pushTokens });

    await signOutParentPhone("token-ana", NOW, { pushTokens, tokens });

    expect(addresses(pushTokens)).toEqual([{ token: OTHER_PHONE, platform: "android", parentTokenId: "token-ben" }]);
    expect(tokens.rows[0].revokedAt).toBe(NOW);
  });
});
