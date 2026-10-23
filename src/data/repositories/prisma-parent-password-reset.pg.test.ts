// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaParentPasswordResetRepository } from "./prisma-parent-password-reset-repository";

/**
 * Step 55.6's reset codes against real Postgres: tries sent at once never
 * pass the limit, one code can't be used twice at the same moment, and a
 * reset removes every phone's sign-in and push address. Only a real
 * database shows the row locks doing their job. Uses a parent of its own,
 * removed afterwards. Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const MINUTE = 60_000;

describeWithDatabase("parent reset codes on Postgres (Step 55.6; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const resets = createPrismaParentPasswordResetRepository(db);
  const parentId = `reset-pg-test-${Date.now()}`;
  const now = () => new Date().toISOString();

  async function newCode(id = crypto.randomUUID(), createdAt = now()) {
    await resets.create(
      { id, parentId, codeHash: "not-a-real-hash", expiresAt: new Date(Date.now() + 15 * MINUTE).toISOString() },
      createdAt,
    );
    return id;
  }

  beforeEach(async () => {
    await db.parent.deleteMany({ where: { id: parentId } });
    await db.parent.create({
      data: {
        id: parentId,
        firstName: "Test",
        lastName: "Parent",
        mobile: "09170000000",
        email: `${parentId}@talaan.example`,
        passwordHash: "old-hash",
      },
    });
  });

  afterAll(async () => {
    // The cascade takes the parent's tokens, push addresses and reset rows.
    await db.parent.deleteMany({ where: { id: parentId } });
    await db.$disconnect();
  });

  it("lets only 5 of 20 tries sent at once through", async () => {
    const id = await newCode();
    const spent = await Promise.all(Array.from({ length: 20 }, () => resets.spendTry(id, now(), 5)));
    expect(spent.filter(Boolean)).toHaveLength(5);
    await expect(resets.spendTry(id, now(), 5)).resolves.toBe(false);
  });

  it("refuses a try on an expired code", async () => {
    const id = await newCode();
    await expect(resets.spendTry(id, new Date(Date.now() + 16 * MINUTE).toISOString(), 5)).resolves.toBe(false);
  });

  it("uses a code once when two resets arrive together, and signs out every phone", async () => {
    const tokenIds = [crypto.randomUUID(), crypto.randomUUID()];
    for (const [index, id] of tokenIds.entries()) {
      await db.parentToken.create({ data: { id, parentId, tokenHash: `reset-pg-test-${id}`, label: null } });
      await db.pushToken.create({
        data: { token: `ExponentPushToken[reset-pg-${Date.now()}-${index}]`, platform: "android", parentTokenId: id },
      });
    }
    const id = await newCode();

    const results = await Promise.all([
      resets.complete(id, parentId, "new-hash-a", now()),
      resets.complete(id, parentId, "new-hash-b", now()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);

    const parent = await db.parent.findUniqueOrThrow({ where: { id: parentId } });
    expect(["new-hash-a", "new-hash-b"]).toContain(parent.passwordHash);
    await expect(db.parentToken.count({ where: { parentId } })).resolves.toBe(0);
    await expect(db.pushToken.count({ where: { parentTokenId: { in: tokenIds } } })).resolves.toBe(0);
    await expect(db.parentPasswordReset.count({ where: { parentId } })).resolves.toBe(0);
  });

  it("counts the last day's codes, deleting older ones, and finds only the newest", async () => {
    const dayAgo = new Date(Date.now() - 24 * 60 * MINUTE).toISOString();
    await newCode(undefined, new Date(Date.now() - 25 * 60 * MINUTE).toISOString());
    await newCode(undefined, new Date(Date.now() - 2 * MINUTE).toISOString());
    const newest = await newCode();

    await expect(resets.countRecent(parentId, dayAgo)).resolves.toBe(2);
    await expect(db.parentPasswordReset.count({ where: { parentId } })).resolves.toBe(2);
    await expect(resets.newest(parentId, dayAgo)).resolves.toMatchObject({ id: newest, tries: 0, usedAt: null });
  });
});
