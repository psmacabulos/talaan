import type { Parent } from "@/features/parents/types";
import { seedParents } from "@/data/seed";
import { normalizeEmail } from "@/features/auth/schemas";
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
  getById(id: string): Promise<Parent | null>;
  /** Any case and surrounding spaces: emails are stored trimmed and in lower case (Step 53.1), and so is what's looked up. */
  findByEmail(email: string): Promise<Parent | null>;
  /**
   * Step 22's signup, with the email stored trimmed and in lower case.
   * Idempotent by `id`, same as the other repositories' `create`. Returns
   * `null` when another account already has the email: two sign-ups at
   * once both pass signup's own check, and only one can be kept.
   */
  create(parent: Parent, password: string): Promise<Parent | null>;
  /**
   * Step 22's sign-in check. Returns the parent when the email exists and
   * the password matches, `null` otherwise — never which of the two was
   * wrong. The real repository spends the same time on an unknown email.
   */
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
    const normalized = normalizeEmail(email);
    return data.find((parent) => parent.email === normalized);
  }

  return {
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
      const stored = { ...parent, email: normalizeEmail(parent.email) };
      const owner = findByEmailSync(stored.email);
      if (owner && owner.id !== stored.id) return null;
      if (!data.some((existing) => existing.id === stored.id)) {
        data.push(stored);
      }
      passwordsByParentId.set(stored.id, password);
      return stored;
    },
    async verifyPassword(email, password) {
      await simulateLatency(latencyMs);
      const parent = findByEmailSync(email);
      if (!parent) return null;
      return passwordsByParentId.get(parent.id) === password ? parent : null;
    },
  };
}
