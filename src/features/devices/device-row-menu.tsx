"use client";

import { Loader2, MoreVertical, Power, PowerOff } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { disableDevice, enableDevice } from "./actions";
import type { Device } from "./types";

// Taller items on phones, where they're tapped with a thumb rather than clicked.
const ITEM_CLASS = "py-2.5 md:py-1";

/** What disabling does to each kind of device, in the words the confirmation shows. */
function consequence(device: Device): string {
  return device.kind === "gate"
    ? "It stops recording taps right away, and its screen says it's disabled. Taps already saved on the tablet are kept."
    : "Its screen stops showing taps within about 5 minutes and says it isn't connected.";
}

/**
 * The ⋮ menu on each device (Step 59.14), the same component in the desktop
 * table's last column and the phone card. An enabled device offers Disable,
 * which asks first; a disabled one offers Enable, which needs no question,
 * since it only brings the same gate or monitor back with the key it has.
 */
export function DeviceRowMenu({
  device,
  onlyEnabledGate,
  className,
}: {
  device: Device;
  /** True when this is the school's last enabled gate: disabling it stops all tap recording. */
  onlyEnabledGate: boolean;
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const enabled = device.status === "active";

  function change(action: typeof disableDevice, done: string) {
    startTransition(async () => {
      const result = await action(device.id);
      if (result.ok) {
        setConfirmOpen(false);
        toast(done);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {/* Not modal, same as the Staff menu and the notification bell (Step 27). */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${device.label}`}
            disabled={isPending}
            className={cn("text-muted-foreground", className)}
          >
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreVertical aria-hidden="true" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {enabled ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)} className={ITEM_CLASS}>
              <PowerOff aria-hidden="true" />
              Disable device
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => change(enableDevice, `${device.label} was enabled`)}
              className={ITEM_CLASS}
            >
              <Power className="text-muted-foreground" aria-hidden="true" />
              Enable device
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={(open) => !isPending && setConfirmOpen(open)}>
        <DialogContent
          showCloseButton={false}
          // The menu item that opened this dialog is gone by the time it closes: focus goes back to the ⋮ button.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Disable {device.label}?</DialogTitle>
            <DialogDescription>
              {consequence(device)} Enable it again any time and it carries on with the same key.
            </DialogDescription>
          </DialogHeader>
          {onlyEnabledGate ? (
            <p role="alert" className="rounded-md bg-status-late-bg px-3 py-2 text-sm text-status-late">
              This is your school&apos;s only enabled gate. No taps will be recorded until you enable it again.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => change(disableDevice, `${device.label} was disabled`)}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Disabling…" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
