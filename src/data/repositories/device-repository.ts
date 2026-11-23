import type { Device } from "@/features/devices/types";

export interface DeviceRepository {
  /** The device a token belongs to, by the token's hash. Revoked devices are returned too; the caller decides. */
  findByTokenHash(tokenHash: string): Promise<Device | null>;
  /** Stores a new device with its token hash (never the token). */
  create(device: Device, tokenHash: string): Promise<Device>;
  /** Marks the device as seen at `at`. A no-op for an unknown id. */
  recordHeartbeat(id: string, at: string): Promise<void>;
  /** The school's gates and monitors, gates first, oldest first (Step 59.12). Never another school's. */
  listBySchool(schoolId: string): Promise<Device[]>;
  /**
   * Marks the device as seen at `at`, but only if it wasn't seen in the
   * `minGapMs` before (Step 59.12), so a device checking in every few
   * minutes writes at most once per gap. A no-op for an unknown id.
   */
  markSeen(id: string, at: string, minGapMs: number): Promise<void>;
  /**
   * Disables or enables one of the school's devices (Step 59.14). Only that
   * school's own: false when the id doesn't exist or belongs to another
   * school. Writes the status and nothing else.
   */
  setStatus(schoolId: string, id: string, status: Device["status"]): Promise<boolean>;
  /** A device's current status, or null for an unknown id: one read by primary key (Step 59.14). */
  findStatus(id: string): Promise<Device["status"] | null>;
}
