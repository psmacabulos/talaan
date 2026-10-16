import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Parent as ParentRow, type PrismaClient } from "@/generated/prisma/client";
import { decoyPasswordHash, passwordMatches } from "@/lib/password";
import { createPrismaParentRepository, toParent, toParentData } from "./prisma-parent-repository";

vi.mock("@/lib/password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/password")>()),
  passwordMatches: vi.fn(async () => false),
  decoyPasswordHash: vi.fn(async () => "scrypt:ZGVjb3k=:ZGVjb3k="),
}));

const row: ParentRow = {
  id: "parent-a",
  firstName: "Liza",
  lastName: "Cruz",
  mobile: "09170000001",
  email: "liza@school-a.example",
  passwordHash: "scrypt:c2FsdA==:aGFzaA==",
  createdAt: new Date("2026-10-09T00:00:00Z"),
  updatedAt: new Date("2026-10-09T00:00:00Z"),
};

describe("toParent", () => {
  it("turns a row into the app's Parent, without the password hash", () => {
    const parent = toParent(row);
    expect(parent).toEqual({
      id: "parent-a",
      firstName: "Liza",
      lastName: "Cruz",
      mobile: "09170000001",
      email: "liza@school-a.example",
    });
    expect(parent).not.toHaveProperty("passwordHash");
  });

  it("rejects a mobile number the app wouldn't accept", () => {
    expect(() => toParent({ ...row, mobile: "12345" })).toThrow();
  });
});

describe("toParentData", () => {
  it("never includes a password field", () => {
    expect(toParentData(toParent(row))).not.toHaveProperty("passwordHash");
  });
});

describe("toParentData's email", () => {
  it("is stored trimmed and in lower case (Step 53.1)", () => {
    expect(toParentData({ ...toParent(row), email: " Liza@School-A.example " }).email).toBe("liza@school-a.example");
  });
});

/** Just enough of a Prisma Client for the parent repository, with each call recorded. */
function fakeDb(found: ParentRow | null, upsert: () => Promise<ParentRow> = async () => row) {
  const parent = { findUnique: vi.fn(async () => found), upsert: vi.fn(upsert) };
  return { db: { parent } as unknown as PrismaClient, parent };
}

describe("createPrismaParentRepository", () => {
  beforeEach(() => vi.mocked(passwordMatches).mockClear());

  it("looks an email up exactly, as stored, so the unique index answers it", async () => {
    const { db, parent } = fakeDb(row);
    await createPrismaParentRepository(db).findByEmail(" LIZA@school-a.example ");
    expect(parent.findUnique).toHaveBeenCalledWith({ where: { email: "liza@school-a.example" } });
  });

  it("still checks a password for an unknown email, against the decoy, so it takes as long", async () => {
    const { db } = fakeDb(null);
    await expect(createPrismaParentRepository(db).verifyPassword("who@example.com", "guess")).resolves.toBeNull();
    expect(passwordMatches).toHaveBeenCalledWith("guess", await decoyPasswordHash());
  });

  it("checks a known email's own hash", async () => {
    const { db } = fakeDb(row);
    vi.mocked(passwordMatches).mockResolvedValueOnce(true);
    await expect(createPrismaParentRepository(db).verifyPassword(row.email, "right")).resolves.toEqual(toParent(row));
    expect(passwordMatches).toHaveBeenCalledWith("right", row.passwordHash);
  });

  it("returns null when another sign-up saved the same email first", async () => {
    const taken = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
    const { db } = fakeDb(null, async () => {
      throw taken;
    });
    await expect(createPrismaParentRepository(db).create(toParent(row), "hunter2ok")).resolves.toBeNull();
  });
});
