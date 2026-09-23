import type { Parent } from "@/features/parents/types";
import { seedParents } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

/**
 * Every seeded parent can sign in with this password — a fixed demo
 * credential (the parent-portal equivalent of the staff demo personas), not
 * a real security feature. Phase 1 has no database, so `create` and
 * `verifyPassword` below keep passwords in a plain in-memory map alongside
 * the seed data; real hashed passwords arrive with Auth.js in Phase 2
 * (CLAUDE.md's Phase 2 notes).
 */
export const SEED_PARENT_PASSWORD = "Talaan123!";

export interface ParentRepository {
  /** A school's parent accounts. */
  listBySchool(schoolId: string): Promise<Parent[]>;
  getById(id: string): Promise<Parent | null>;
  /** Case-insensitive — both signup's "email already used" check and sign-in go through this. */
  findByEmail(email: string): Promise<Parent | null>;
  /** Step 22's signup. Idempotent by `id`, same as the other mock repositories' `create`. */
  create(parent: Parent, password: string): Promise<Parent>;
  /** Step 22's sign-in check. Returns the parent when the email exists and the password matches, `null` otherwise — never which of the two was wrong. */
  verifyPassword(email: string, password: string): Promise<Parent | null>;
}

export function createMockParentRepository(
  data: Parent[] = seedParents,
  options: { latencyMs?: number; seedPassword?: string } = {},
): ParentRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  // Stands in for a real `password_hash` column. Seeded with the same demo
  // password for every parent already in `data` — see SEED_PARENT_PASSWORD.
  const passwordsByParentId = new Map<string, string>(
    data.map((parent) => [parent.id, options.seedPassword ?? SEED_PARENT_PASSWORD]),
  );

  function findByEmailSync(email: string): Parent | undefined {
    const normalized = email.trim().toLowerCase();
    return data.find((parent) => parent.email.toLowerCase() === normalized);
  }

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((parent) => parent.schoolId === schoolId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((parent) => parent.id === id) ?? null;
    },
    async findByEmail(email) {
      await simulateLatency(latencyMs);
      return findByEmailSync(email) ?? null;
    },
    async create(parent, password) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === parent.id)) {
        data.push(parent);
      }
      passwordsByParentId.set(parent.id, password);
      return parent;
    },
    async verifyPassword(email, password) {
      await simulateLatency(latencyMs);
      const parent = findByEmailSync(email);
      if (!parent) return null;
      return passwordsByParentId.get(parent.id) === password ? parent : null;
    },
  };
}

export const parentRepository = createMockParentRepository();
