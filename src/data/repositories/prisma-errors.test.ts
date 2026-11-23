import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { isDeadlock, retryOnce } from "./prisma-errors";

function prismaError(code: string, message = "boom") {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: "test" });
}

describe("isDeadlock (Step 60.2)", () => {
  it("recognises a write conflict and a raw query's deadlock", () => {
    expect(isDeadlock(prismaError("P2034"))).toBe(true);
    expect(isDeadlock(prismaError("P2010", "Raw query failed. Code: `40P01`. Message: deadlock detected"))).toBe(true);
  });

  it("does not take other errors for one", () => {
    expect(isDeadlock(prismaError("P2010", "Raw query failed. Code: `42601`."))).toBe(false);
    expect(isDeadlock(prismaError("P2003"))).toBe(false);
    expect(isDeadlock(new Error("40P01"))).toBe(false);
  });
});

describe("retryOnce (Step 60.2)", () => {
  it("runs again after an error it recognises, and gives that run's answer", async () => {
    const run = vi.fn().mockRejectedValueOnce(prismaError("P2034")).mockResolvedValueOnce("done");
    await expect(retryOnce(run, isDeadlock)).resolves.toBe("done");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("gives up after one more try", async () => {
    const run = vi.fn().mockRejectedValue(prismaError("P2034"));
    await expect(retryOnce(run, isDeadlock)).rejects.toMatchObject({ code: "P2034" });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does not retry an error it doesn't recognise", async () => {
    const run = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(retryOnce(run, isDeadlock)).rejects.toThrow("nope");
    expect(run).toHaveBeenCalledTimes(1);
  });
});
