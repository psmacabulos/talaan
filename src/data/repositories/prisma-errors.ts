import { Prisma } from "@/generated/prisma/client";

/** Prisma's error code for "a unique value is already taken". */
const UNIQUE_CONSTRAINT_FAILED = "P2002";

/** True when a write failed because another row already holds a value that must be unique. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_FAILED;
}
