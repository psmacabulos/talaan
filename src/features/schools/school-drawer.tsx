"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SchoolForm } from "./school-form";

/**
 * Thin Sheet chrome around SchoolForm (Step 25), same shape as
 * `StaffDrawer`. Only renders the form while `open` is true, so it mounts
 * fresh — and blank — every time it's opened; there's no "edit school" mode
 * yet. No width classes: the sheet base's `data-[side=right]` variants
 * (w-3/4 on phones, sm:max-w-sm on desktop) outrank plain utilities, so
 * this drawer renders at the same size as the staff drawer — ¾ of the
 * screen on a phone, 384px on desktop.
 */
export function SchoolDrawer({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Add school</SheetTitle>
          <SheetDescription>
            Give the new school its name, colors, principal and logo.
          </SheetDescription>
        </SheetHeader>
        {open ? <SchoolForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
