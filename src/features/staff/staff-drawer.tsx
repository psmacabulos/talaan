"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StaffForm } from "./staff-form";

/**
 * Thin Sheet chrome around StaffForm (Step 18), same shape as
 * `StudentDrawer`. Only renders the form while `open` is true, so it
 * mounts fresh — and blank — every time it's opened; there's no "edit" mode
 * yet, so unlike `StudentDrawer` there's no `key` needed to force a remount
 * between different records.
 */
export function StaffDrawer({
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
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Invite staff</SheetTitle>
          <SheetDescription>Add a principal or teacher who can sign in to this school.</SheetDescription>
        </SheetHeader>
        {open ? <StaffForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
