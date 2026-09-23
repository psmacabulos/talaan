"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "./notification-actions";

/**
 * The "Mark all as read" action on the notifications page (the bell has its
 * own, inside the dropdown). Same shape as `simulate-tap-button.tsx`:
 * useTransition for the pending state and a toast to report the outcome,
 * while the action's own `refresh()` brings the now-read list back in.
 */
export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.ok) {
        toast("All notifications marked as read");
      } else {
        toast.error(result.formError);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <CheckCheck className="size-4" aria-hidden="true" />
      )}
      Mark all as read
    </Button>
  );
}
