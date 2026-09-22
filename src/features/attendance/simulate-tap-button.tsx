"use client";

import { useTransition } from "react";
import { Nfc, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { simulateTap } from "./actions";

/**
 * Phase 1 has no real tap station wired to this dashboard yet (Step 19,
 * and the real hardware/API in Phase 2) — this stands in so "does the
 * count and feed actually update live" (this step's own "Done when") can
 * be checked today. `simulateTap` doesn't touch a cookie, so unlike the
 * Step 11 dev switcher it can't rely on an automatic re-render; the toast
 * here is what tells the person it worked, and the action's own
 * `refresh()` call is what actually brings the new data in.
 */
export function SimulateTapButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await simulateTap();

      if (result.tapped) {
        toast(`${result.studentName} tapped in`, {
          description: "The counts and the live feed just updated.",
        });
        return;
      }

      if (result.reason === "no-card") {
        const names = result.studentNames;
        toast(
          names.length === 1
            ? `${names[0]} has no ID card yet`
            : `${names.length} students have no ID card yet`,
          {
            description:
              names.length === 1
                ? "They can't tap in until a card is linked to them."
                : `${names.join(", ")} can't tap in until a card is linked to them.`,
          },
        );
        return;
      }

      toast(
        result.reason === "everyone-in"
          ? "Everyone has already tapped in"
          : "Pick a school first",
      );
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Nfc className="size-4" aria-hidden="true" />
      )}
      Simulate a tap
    </Button>
  );
}
