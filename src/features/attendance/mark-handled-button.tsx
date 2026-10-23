"use client";

import { Check, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAlertHandled } from "./actions";

/**
 * "Mark handled" on a "Needs attention" alert (Step 57). No confirm step:
 * nothing is deleted, the alert just stops showing. The server refreshes
 * the page, which takes the alert away.
 */
export function MarkHandledButton({ alertId, label }: { alertId: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAlertHandled(alertId);
      if (result.ok) toast("Marked handled");
      else toast.error(result.error);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      aria-label={label}
      className="min-h-11 self-start text-foreground sm:min-h-8"
    >
      {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
      {isPending ? "Marking…" : "Mark handled"}
    </Button>
  );
}
