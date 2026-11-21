"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddDeviceDialog } from "./add-device-dialog";
import type { DeviceKind } from "./types";

type Opening = { kind: DeviceKind; opened: number; open: boolean };

/**
 * "Add gate" and "Add monitor" under the Devices page's heading, as on the
 * design board (Step 59.13), and the dialog they open. Each open gets a new
 * `key`, so the dialog always starts at step 1 and a secret from the last
 * one is gone. The kind stays set while the dialog fades out.
 */
export function AddDeviceButtons() {
  const [opening, setOpening] = useState<Opening | null>(null);

  function openFor(kind: DeviceKind) {
    setOpening((current) => ({ kind, opened: (current?.opened ?? 0) + 1, open: true }));
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openFor("gate")}>
          <Plus className="size-4" aria-hidden="true" />
          Add gate
        </Button>
        <Button variant="outline" onClick={() => openFor("monitor")}>
          <Plus className="size-4" aria-hidden="true" />
          Add monitor
        </Button>
      </div>
      {opening ? (
        <AddDeviceDialog
          key={opening.opened}
          kind={opening.kind}
          open={opening.open}
          onOpenChange={(open) => setOpening((current) => (current ? { ...current, open } : current))}
        />
      ) : null}
    </>
  );
}
