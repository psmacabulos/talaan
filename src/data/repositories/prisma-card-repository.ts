import { Prisma, type Card as CardRow, type PrismaClient } from "@/generated/prisma/client";
import { cardSchema } from "@/features/students/schemas";
import type { Card } from "@/features/students/types";
import { prisma } from "@/lib/db";
import type { CardRepository } from "./card-repository";

/** A database row → the app's own `Card`. The app keeps times as ISO strings, the database as real timestamps. */
export function toCard(row: CardRow): Card {
  return cardSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    serial: row.serial,
    status: row.status,
    linkedAt: row.linkedAt.toISOString(),
  });
}

/** The app's `Card` → the columns Prisma writes. The reverse of `toCard`. */
export function toCardData(card: Card) {
  return {
    schoolId: card.schoolId,
    studentId: card.studentId,
    serial: card.serial,
    status: card.status,
    linkedAt: new Date(card.linkedAt),
  };
}

const RECORD_NOT_FOUND = "P2025";

export function createPrismaCardRepository(db: PrismaClient = prisma): CardRepository {
  return {
    async listByStudent(studentId) {
      const rows = await db.card.findMany({ where: { studentId }, orderBy: { linkedAt: "asc" } });
      return rows.map(toCard);
    },
    async getActiveForStudent(studentId) {
      const row = await db.card.findFirst({ where: { studentId, status: "active" } });
      return row ? toCard(row) : null;
    },
    async getBySerial(serial) {
      const row = await db.card.findUnique({ where: { serial } });
      return row ? toCard(row) : null;
    },
    async create(card) {
      const row = await db.card.upsert({
        where: { id: card.id },
        update: {},
        create: { id: card.id, ...toCardData(card) },
      });
      return toCard(row);
    },
    async markLost(cardId) {
      try {
        const row = await db.card.update({ where: { id: cardId }, data: { status: "lost" } });
        return toCard(row);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND) {
          return null;
        }
        throw error;
      }
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const cardRepository = createPrismaCardRepository();
