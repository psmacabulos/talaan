import { connectionStatus, KIND_LABEL, lastSeenLabel } from "./connection";
import { DeviceKindIcon } from "./device-art";
import { DeviceRowMenu } from "./device-row-menu";
import { ConnectionLabel, DeviceStatusBadge } from "./device-display";
import type { Device } from "./types";

/**
 * The school's gates and monitors below 768px (Step 59.12), one card each,
 * as on the design board: the name, then its type, connection and when it
 * was last seen. The badge and the ⋮ menu (Step 59.14) sit on the right.
 */
export function DeviceCards({
  devices,
  now,
  onlyEnabledGateId,
}: {
  devices: Device[];
  now: string;
  onlyEnabledGateId: string | null;
}) {
  return (
    <ul aria-label="Devices" className="flex flex-col gap-2">
      {devices.map((device) => {
        const seen = lastSeenLabel(device.lastSeenAt, now);
        return (
          <li key={device.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <DeviceKindIcon kind={device.kind} className="size-10" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base leading-snug font-semibold wrap-break-word text-foreground">{device.label}</h3>
              <p className="text-sm leading-snug text-muted-foreground">{KIND_LABEL[device.kind]}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <ConnectionLabel connection={connectionStatus(device.lastSeenAt, now)} />
                {seen ? <span className="text-sm text-muted-foreground">· {seen}</span> : null}
              </div>
            </div>
            {/* The 44px menu button hangs past the card's padding, so the badge keeps its place at the right edge. */}
            <div className="-mt-1.5 -mr-3 flex shrink-0 items-center gap-1">
              <DeviceStatusBadge status={device.status} />
              <DeviceRowMenu device={device} onlyEnabledGate={device.id === onlyEnabledGateId} className="size-11" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
