import type { Tap } from "@/features/attendance/types";
import { seedTaps } from "@/data/seed";
import { schoolDateOf } from "@/lib/school-time";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface TapRepository {
  /** A school's taps on one calendar day on the school's clock ("2026-06-19"), earliest first. What every one-day page loads, instead of the school's whole history. */
  listBySchoolOnDate(schoolId: string, date: string): Promise<Tap[]>;
  listByStudent(studentId: string): Promise<Tap[]>;
  /** One tap, for example the one an alert points at, whatever day it was. */
  getById(id: string): Promise<Tap | null>;
  /** The earliest stored tap of this card at this school strictly between `from` and `to`, if any: the gate's 2-minute debounce (Step 45). */
  findByCardBetween(schoolId: string, cardSerial: string, from: string, to: string): Promise<Tap | null>;
  /**
   * Appends a tap (Step 13's "Simulate a tap"). Idempotent by `id`, the
   * same way a real station's tap would be (CLAUDE.md: "idempotent by a
   * device-made UUID... repeated taps... are ignored") — calling this twice
   * with the same `id` is a no-op the second time, not a duplicate.
   */
  create(tap: Tap): Promise<Tap>;
}

export function createMockTapRepository(data: Tap[] = seedTaps, options: { latencyMs?: number } = {}): TapRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchoolOnDate(schoolId, date) {
      await simulateLatency(latencyMs);
      return data
        .filter((tap) => tap.schoolId === schoolId && schoolDateOf(tap.tappedAt) === date)
        .sort((a, b) => Date.parse(a.tappedAt) - Date.parse(b.tappedAt));
    },
    async listByStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.filter((tap) => tap.studentId === studentId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((tap) => tap.id === id) ?? null;
    },
    async findByCardBetween(schoolId, cardSerial, from, to) {
      await simulateLatency(latencyMs);
      const start = Date.parse(from);
      const end = Date.parse(to);
      return (
        data
          .filter((tap) => tap.schoolId === schoolId && tap.cardSerial === cardSerial)
          .filter((tap) => Date.parse(tap.tappedAt) > start && Date.parse(tap.tappedAt) < end)
          .sort((a, b) => Date.parse(a.tappedAt) - Date.parse(b.tappedAt))[0] ?? null
      );
    },
    async create(tap) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === tap.id)) {
        data.push(tap);
      }
      return tap;
    },
  };
}
