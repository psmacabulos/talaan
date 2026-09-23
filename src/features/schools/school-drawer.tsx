"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SchoolForm } from "./school-form";

/**
 * Thin Sheet chrome around SchoolForm (Step 25), same shape as
 * `StaffDrawer`. Only renders the form while `open` is true, so it mounts
 * fresh — and blank — every time it's opened; there's no "edit school" mode
 * yet.
 *
 * On phones it fills the whole screen width (Step 27.8), the same as the
 * staff drawer. The override repeats the Sheet's `data-[side=right]:`
 * prefix, since a plain `w-full` loses to the Sheet's own `w-3/4`. From
 * 640px up the Sheet's `max-w-sm` still caps it at 384px.
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
      <SheetContent className="flex flex-col gap-0 data-[side=right]:w-full">
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
