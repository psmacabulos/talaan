import type { Card } from "@/features/students/types";
import { seedCards } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface CardRepository {
  /** A student's full card history — active, lost and retired alike — only within `schoolId` (Step 51). */
  listByStudent(schoolId: string, studentId: string): Promise<Card[]>;
  /** The one card, if any, currently linked to a student (CLAUDE.md: one active card per student), only within `schoolId`. */
  getActiveForStudent(schoolId: string, studentId: string): Promise<Card | null>;
  /**
   * Whichever card a serial belongs to, at any school. Unscoped on purpose:
   * a serial is unique across every school (one physical card), so linking
   * a card must see another school's to refuse it. Every caller compares
   * the card's school with its own before using it.
   */
  getBySerial(serial: string): Promise<Card | null>;
  /** This school's cards whose serial starts with these 4 bytes ("53:2E:98:0C"): the exact card and any 4- or 7-byte twin. */
  listBySerialPrefix(schoolId: string, firstFourBytes: string): Promise<Card[]>;
  /** Every active card at a school: the gate's roster (Step 46). */
  listActiveBySchool(schoolId: string): Promise<Card[]>;
  /** Links a new card (Step 16's "Link card"/"Simulate a card tap"). Idempotent by `id`, same as `StudentRepository.create`. */
  create(card: Card): Promise<Card>;
  /** Marks a card lost (Step 16's "Replace a lost card"), only within `schoolId`. Returns `null` if there's no such card there. */
  markLost(schoolId: string, cardId: string): Promise<Card | null>;
}

export function createMockCardRepository(
  data: Card[] = seedCards,
  options: { latencyMs?: number } = {},
): CardRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listByStudent(schoolId, studentId) {
      await simulateLatency(latencyMs);
      return data.filter((card) => card.studentId === studentId && card.schoolId === schoolId);
    },
    async getActiveForStudent(schoolId, studentId) {
      await simulateLatency(latencyMs);
      return (
        data.find((card) => card.studentId === studentId && card.schoolId === schoolId && card.status === "active") ??
        null
      );
    },
    async getBySerial(serial) {
      await simulateLatency(latencyMs);
      return data.find((card) => card.serial === serial) ?? null;
    },
    async listActiveBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((card) => card.schoolId === schoolId && card.status === "active");
    },
    async listBySerialPrefix(schoolId, firstFourBytes) {
      await simulateLatency(latencyMs);
      return data.filter((card) => card.schoolId === schoolId && card.serial.startsWith(firstFourBytes));
    },
    async create(card) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === card.id)) {
        data.push(card);
      }
      return card;
    },
    async markLost(schoolId, cardId) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((existing) => existing.id === cardId && existing.schoolId === schoolId);
      if (index === -1) return null;
      data[index] = { ...data[index], status: "lost" };
      return data[index];
    },
  };
}
