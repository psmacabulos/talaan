import type { Staff } from "@/features/staff/types";
import { seedStaff } from "@/data/seed";
import { SEED_STAFF_PASSWORD_HASH } from "@/data/seed/staff-password";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

/** A staff member plus their stored password hash, for the session check only. A `Staff` object never carries the hash. */
export type StaffWithPasswordHash = { staff: Staff; passwordHash: string | null };

export interface StaffRepository {
  /** A school's own staff — never includes the global super admin. */
  listBySchool(schoolId: string): Promise<Staff[]>;
  getById(id: string): Promise<Staff | null>;
  /** Case-insensitive. Emails are unique across every school, so this finds at most one person. */
  findByEmail(email: string): Promise<Staff | null>;
  /** For `resolveSession` (src/lib/session.ts): the staff member and their password hash, null when the hash isn't set. */
  getForSession(id: string): Promise<StaffWithPasswordHash | null>;
  /** For the sign-in form (Step 50.1): the account behind an email, case-insensitive, with its password hash. */
  findForSignIn(email: string): Promise<StaffWithPasswordHash | null>;
  /** Every staff member, every school, plus the super admin — the Step 11 dev switcher's full persona list. */
  list(): Promise<Staff[]>;
  /** Appends a newly invited staff member (Step 18). Idempotent by `id`, same shape as `StudentRepository.create`. */
  create(staff: Staff): Promise<Staff>;
  /** Removes a staff member's access (Step 27.6). A no-op for an unknown id, so a repeated click can't fail. */
  remove(id: string): Promise<void>;
}

export function createMockStaffRepository(
  data: Staff[] = seedStaff,
  options: { latencyMs?: number } = {},
): StaffRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  // Stands in for the `passwordHash` column: every active seed account has
  // the demo password, and an invited one has none yet, like the database.
  const passwordHashes = new Map<string, string>(
    data.filter((staff) => staff.status === "active").map((staff) => [staff.id, SEED_STAFF_PASSWORD_HASH]),
  );

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((staff) => staff.schoolId === schoolId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((staff) => staff.id === id) ?? null;
    },
    async findByEmail(email) {
      await simulateLatency(latencyMs);
      const normalized = email.trim().toLowerCase();
      return data.find((staff) => staff.email.toLowerCase() === normalized) ?? null;
    },
    async getForSession(id) {
      await simulateLatency(latencyMs);
      const staff = data.find((member) => member.id === id);
      return staff ? { staff, passwordHash: passwordHashes.get(id) ?? null } : null;
    },
    async findForSignIn(email) {
      await simulateLatency(latencyMs);
      const normalized = email.trim().toLowerCase();
      const staff = data.find((member) => member.email.toLowerCase() === normalized);
      return staff ? { staff, passwordHash: passwordHashes.get(staff.id) ?? null } : null;
    },
    async list() {
      await simulateLatency(latencyMs);
      return [...data];
    },
    async create(staff) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === staff.id)) {
        data.push(staff);
      }
      return staff;
    },
    async remove(id) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((staff) => staff.id === id);
      if (index !== -1) data.splice(index, 1);
    },
  };
}
