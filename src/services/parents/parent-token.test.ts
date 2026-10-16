import { describe, expect, it } from "vitest";
import { createMockParentTokenRepository } from "@/data/repositories/parent-token-repository";
import { authenticateParent, issueParentToken, PARENT_TOKEN_PREFIX, revokeParentToken } from "./parent-token";

const NOW = "2026-10-16T00:00:00.000Z";
const DAY = 24 * 60 * 60_000;

function later(ms: number): string {
  return new Date(Date.parse(NOW) + ms).toISOString();
}

describe("parent tokens", () => {
  it("issues a tal_par_ token that signs its parent in, stored only as a hash", async () => {
    const tokens = createMockParentTokenRepository();
    const token = await issueParentToken("parent-1", "Pixel 7", NOW, { tokens });

    expect(token.startsWith(PARENT_TOKEN_PREFIX)).toBe(true);
    expect(tokens.rows[0].tokenHash).not.toContain(token);
    await expect(authenticateParent(`Bearer ${token}`, NOW, { tokens })).resolves.toEqual({
      parentId: "parent-1",
      tokenId: tokens.rows[0].id,
    });
  });

  it("refuses no header, a gate's token, a made-up token and a revoked one", async () => {
    const tokens = createMockParentTokenRepository();
    const token = await issueParentToken("parent-1", null, NOW, { tokens });

    await expect(authenticateParent(null, NOW, { tokens })).resolves.toBeNull();
    await expect(authenticateParent("Bearer tal_dev_abc", NOW, { tokens })).resolves.toBeNull();
    await expect(authenticateParent(`Bearer ${PARENT_TOKEN_PREFIX}made-up`, NOW, { tokens })).resolves.toBeNull();

    await revokeParentToken(tokens.rows[0].id, NOW, { tokens });
    await expect(authenticateParent(`Bearer ${token}`, NOW, { tokens })).resolves.toBeNull();
  });

  it("stops working after 90 days unused, and using it keeps it alive", async () => {
    const tokens = createMockParentTokenRepository();
    const token = await issueParentToken("parent-1", null, NOW, { tokens });

    await expect(authenticateParent(`Bearer ${token}`, later(80 * DAY), { tokens })).resolves.not.toBeNull();
    // Used on day 80, so on day 160 it's been 80 days unused: still fine.
    await expect(authenticateParent(`Bearer ${token}`, later(160 * DAY), { tokens })).resolves.not.toBeNull();
    await expect(authenticateParent(`Bearer ${token}`, later(251 * DAY), { tokens })).resolves.toBeNull();
  });

  it("writes lastUsedAt at most once an hour", async () => {
    const tokens = createMockParentTokenRepository();
    const token = await issueParentToken("parent-1", null, NOW, { tokens });

    await authenticateParent(`Bearer ${token}`, later(30 * 60_000), { tokens });
    expect(tokens.rows[0].lastUsedAt).toBe(NOW);
    await authenticateParent(`Bearer ${token}`, later(61 * 60_000), { tokens });
    expect(tokens.rows[0].lastUsedAt).toBe(later(61 * 60_000));
  });

  it("clears a parent's revoked and long-unused tokens at the next sign-in, and no one else's", async () => {
    const tokens = createMockParentTokenRepository();
    await issueParentToken("parent-1", "old phone", NOW, { tokens });
    await issueParentToken("parent-1", "revoked", NOW, { tokens });
    await issueParentToken("parent-2", "someone else's", NOW, { tokens });
    await revokeParentToken(tokens.rows[1].id, NOW, { tokens });

    await issueParentToken("parent-1", "new phone", later(91 * DAY), { tokens });

    expect(tokens.rows.map((row) => row.parentId)).toEqual(["parent-2", "parent-1"]);
  });
});
