import type { Staff } from "@/features/staff/types";
import { seedStaff } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface StaffRepository {
  /** A school's own staff — never includes the global super admin. */
  listBySchool(schoolId: string): Promise<Staff[]>;
  getById(id: string): Promise<Staff | null>;
  /** Every staff member, every school, plus the super admin — the Step 11 dev switcher's full persona list. */
  list(): Promise<Staff[]>;
}

export function createMockStaffRepository(
  data: Staff[] = seedStaff,
  options: { latencyMs?: number } = {},
): StaffRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((staff) => staff.schoolId === schoolId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((staff) => staff.id === id) ?? null;
    },
    async list() {
      await simulateLatency(latencyMs);
      return [...data];
    },
  };
}

export const staffRepository = createMockStaffRepository();
