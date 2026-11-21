import { connectionStatus, KIND_LABEL, lastSeenLabel } from "./connection";
import { DeviceKindIcon } from "./device-art";
import { ConnectionLabel, DeviceStatusBadge } from "./device-display";
import type { Device } from "./types";

/**
 * The school's gates and monitors below 768px (Step 59.12), one card each,
 * as on the design board: the name, then its type, connection and when it
 * was last seen. The badge sits on the right, where the ⋯ menu joins it in
 * Step 59.14.
 */
export function DeviceCards({ devices, now }: { devices: Device[]; now: string }) {
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
            <DeviceStatusBadge status={device.status} className="shrink-0" />
          </li>
        );
      })}
    </ul>
  );
}
