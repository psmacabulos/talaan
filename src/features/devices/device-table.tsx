import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { connectionStatus, KIND_LABEL, lastSeenLabel } from "./connection";
import { DeviceKindIcon } from "./device-art";
import { ConnectionLabel, DeviceStatusBadge } from "./device-display";
import type { Device } from "./types";

/**
 * The school's gates and monitors from 768px up (Step 59.12). Below that,
 * `DeviceCards` shows the same devices. The ⋯ menu (disable, enable)
 * comes with Step 59.14.
 */
export function DeviceTable({ devices, now }: { devices: Device[]; now: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table label="Devices">
        <TableHeader>
          <TableRow>
            <TableHead>Device name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell className="font-medium text-foreground">{device.label}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <DeviceKindIcon kind={device.kind} className="size-7" />
                  {KIND_LABEL[device.kind]}
                </span>
              </TableCell>
              <TableCell>
                <ConnectionLabel connection={connectionStatus(device.lastSeenAt, now)} />
              </TableCell>
              <TableCell className="text-muted-foreground">{lastSeenLabel(device.lastSeenAt, now) ?? "—"}</TableCell>
              <TableCell>
                <DeviceStatusBadge status={device.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
