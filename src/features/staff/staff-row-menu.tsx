"use client";

import { Loader2, MoreVertical, Send, UserMinus } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAIN_CONTENT_ID } from "@/components/skip-link";
import { cn } from "@/lib/utils";
import { removeStaff, resendStaffInvite } from "./actions";
import { staffRowActions } from "./row-actions";
import { staffName } from "./staff-display";
import type { Staff } from "./types";

// Taller items on phones, where they're tapped with a thumb rather than clicked.
const ITEM_CLASS = "py-2.5 md:py-1";

/**
 * The ⋮ menu on each staff row — the same component in the desktop table's
 * last column and the mobile card's header (Step 27.6). Renders nothing
 * when the row has no actions (the signed-in principal's own, already
 * accepted, account), rather than a menu that opens onto nothing.
 *
 * Remove is destructive, so it opens a confirmation dialog instead of
 * acting straight away (CLAUDE.md's UX quality bar).
 */
export function StaffRowMenu({
  staff,
  currentUserId,
  className,
}: {
  staff: Staff;
  currentUserId: string;
  className?: string;
}) {
  const { canResend, canRemove } = staffRowActions(staff, currentUserId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const removedRef = useRef(false);
  const name = staffName(staff);

  if (!canResend && !canRemove) return null;

  function handleResend() {
    startTransition(async () => {
      const result = await resendStaffInvite(staff.id);
      if (result.ok) toast(`Invitation sent again to ${staff.email}`);
      else toast.error(result.error);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeStaff(staff.id);
      if (result.ok) {
        removedRef.current = true;
        setConfirmOpen(false);
        toast(`${name} was removed`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {/* Not modal, same as the theme toggle and notification bell (Step 27). */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${name}`}
            disabled={isPending}
            className={cn("text-muted-foreground", className)}
          >
            {isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <MoreVertical aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* The phone list leaves the email out to stay compact, so it's
              here instead: one tap away. The desktop table shows it already. */}
          <DropdownMenuLabel className="font-normal wrap-anywhere text-muted-foreground md:hidden">
            {staff.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="md:hidden" />
          {canResend ? (
            <DropdownMenuItem onSelect={handleResend} className={ITEM_CLASS}>
              <Send className="text-muted-foreground" aria-hidden="true" />
              Resend invitation
            </DropdownMenuItem>
          ) : null}
          {canResend && canRemove ? <DropdownMenuSeparator /> : null}
          {canRemove ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)} className={ITEM_CLASS}>
              <UserMinus aria-hidden="true" />
              Remove
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={(open) => !isPending && setConfirmOpen(open)}>
        <DialogContent
          showCloseButton={false}
          // The menu item that opened this dialog is gone by the time it
          // closes, so focus goes back to the ⋮ button instead. After a
          // removal that button's row is about to disappear too, so focus
          // moves to the page's main area (the skip link's target) rather
          // than falling to the page body, where a keyboard user would
          // have to start again from the top.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (removedRef.current) document.getElementById(MAIN_CONTENT_ID)?.focus();
            else triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Remove {name}?</DialogTitle>
            <DialogDescription>
              They won&apos;t be able to sign in to this school any more. You can invite them again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
