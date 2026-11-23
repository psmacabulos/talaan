import { Prisma } from "@/generated/prisma/client";

/** Prisma's error code for "a unique value is already taken". */
const UNIQUE_CONSTRAINT_FAILED = "P2002";

/** True when a write failed because another row already holds a value that must be unique. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_FAILED;
}

/** Prisma's error code for "the row this one points to isn't there". */
const FOREIGN_KEY_FAILED = "P2003";

/** True when a write failed because the row it points to was deleted, or never existed. */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === FOREIGN_KEY_FAILED;
}

/**
 * True when Postgres stopped a transaction because two were waiting on each
 * other (Step 60.2): Prisma's write-conflict code P2034, or P2010 (a failed
 * raw query, such as the lock) whose message carries Postgres's own
 * deadlock code 40P01. Safe to run again: the other one has finished.
 */
export function isDeadlock(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return error.code === "P2034" || (error.code === "P2010" && error.message.includes("40P01"));
}

/** Runs `run`, and once more if it fails with an error `shouldRetry` recognises. The catch is outside any transaction `run` opens. */
export async function retryOnce<T>(run: () => Promise<T>, shouldRetry: (error: unknown) => boolean): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!shouldRetry(error)) throw error;
    return run();
  }
}
