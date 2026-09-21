import type { Card } from "@/features/students/types";
import { seedCards } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface CardRepository {
  /** A student's full card history — active, lost and retired alike. */
  listByStudent(studentId: string): Promise<Card[]>;
  /** The one card, if any, currently linked to a student (CLAUDE.md: one active card per student). */
  getActiveForStudent(studentId: string): Promise<Card | null>;
  /** Looks up whichever card a physical tap's serial currently belongs to. */
  getBySerial(serial: string): Promise<Card | null>;
}

export function createMockCardRepository(
  data: Card[] = seedCards,
  options: { latencyMs?: number } = {},
): CardRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listByStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.filter((card) => card.studentId === studentId);
    },
    async getActiveForStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.find((card) => card.studentId === studentId && card.status === "active") ?? null;
    },
    async getBySerial(serial) {
      await simulateLatency(latencyMs);
      return data.find((card) => card.serial === serial) ?? null;
    },
  };
}

export const cardRepository = createMockCardRepository();
