"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signInAsDemo } from "./actions";
import { DEMO_PERSONAS } from "./demo-personas";

/**
 * The prototype's "Try the prototype as" row — a stand-in for real accounts
 * until Phase 2, same as the Step 11 dev switcher it shares `signInAsDemo`
 * with. Kept as a permanent Phase 1 fixture (not dev-only like the
 * switcher): a first-time reviewer with no seeded credentials still needs a
 * way in.
 */
export function DemoShortcuts({ signInEnabled }: { signInEnabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [pendingStaffId, setPendingStaffId] = useState<string | null>(null);

  function signInAs(staffId: string) {
    if (!signInEnabled) {
      toast("Sign-in isn't connected yet", {
        description: "That's Phase 2 — this preview button will work once real accounts exist.",
      });
      return;
    }
    setPendingStaffId(staffId);
    startTransition(() => signInAsDemo(staffId));
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-8">
      <h2 className="text-sm font-semibold text-foreground">Try the prototype as</h2>
      <div className="flex flex-wrap gap-2">
        {DEMO_PERSONAS.map((persona) => (
          <Button
            key={persona.staffId}
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => signInAs(persona.staffId)}
          >
            {isPending && pendingStaffId === persona.staffId && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            )}
            {persona.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Sample data only. Nothing here is saved.</p>
    </div>
  );
}
