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
