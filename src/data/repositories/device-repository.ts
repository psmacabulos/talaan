import type { Device } from "@/features/devices/types";

export interface DeviceRepository {
  /** The device a token belongs to, by the token's hash. Revoked devices are returned too; the caller decides. */
  findByTokenHash(tokenHash: string): Promise<Device | null>;
  /** Stores a new device with its token hash (never the token). */
  create(device: Device, tokenHash: string): Promise<Device>;
  /** Marks the device as seen at `at`. A no-op for an unknown id. */
  recordHeartbeat(id: string, at: string): Promise<void>;
}
