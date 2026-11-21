import { EmptyState } from "@/components/empty-state";
import { DevicesIllustration } from "./device-art";
import { DeviceCards } from "./device-cards";
import { DeviceTable } from "./device-table";
import type { Device } from "./types";

/**
 * The Devices page's list (Step 59.12): cards on a phone, a table from
 * 768px, swapped with CSS so the server's HTML is already right for the
 * screen, as on the staff page.
 */
export function DevicesList({ devices, now }: { devices: Device[]; now: string }) {
  if (devices.length === 0) {
    return (
      <EmptyState
        illustration={<DevicesIllustration className="mb-2 w-48 sm:w-56" />}
        title="No devices yet"
        description="Add a gate tablet or a monitor to start recording and showing attendance."
      />
    );
  }

  return (
    <>
      <div className="md:hidden">
        <DeviceCards devices={devices} now={now} />
      </div>
      <div className="hidden md:block">
        <DeviceTable devices={devices} now={now} />
      </div>
    </>
  );
}
