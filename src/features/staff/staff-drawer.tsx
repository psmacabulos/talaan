"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StaffForm } from "./staff-form";

/**
 * Thin Sheet chrome around StaffForm (Step 18), same shape as
 * `StudentDrawer`. Only renders the form while `open` is true, so it
 * mounts fresh — and blank — every time it's opened; there's no "edit" mode
 * yet, so unlike `StudentDrawer` there's no `key` needed to force a remount
 * between different records.
 *
 * On phones it fills the whole screen width (Step 27.6): the Sheet's own
 * `w-3/4` left a 281px-wide form at 375px, too narrow for two fields side
 * by side. The override has to repeat the Sheet's `data-[side=right]:`
 * prefix to replace that rule — a plain `w-full` loses to it. From 640px up
 * the Sheet's own `max-w-sm` still caps it, so desktop is unchanged.
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
      <SheetContent className="flex flex-col gap-0 data-[side=right]:w-full">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Invite staff</SheetTitle>
          <SheetDescription>Add a principal or teacher who can sign in to this school.</SheetDescription>
        </SheetHeader>
        {open ? <StaffForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
