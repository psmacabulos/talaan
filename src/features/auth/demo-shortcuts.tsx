"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInAsDemo } from "./actions";
import { DEMO_PERSONAS } from "./demo-personas";

/**
 * The prototype's "Try the prototype as" row: sign in as a demo account
 * with one click, no password. Development only: the sign-in page doesn't
 * render it in production, and `signInAsDemo` throws there anyway
 * (Step 50.1).
 */
export function DemoShortcuts() {
  const [isPending, startTransition] = useTransition();
  const [pendingStaffId, setPendingStaffId] = useState<string | null>(null);

  function signInAs(staffId: string) {
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
      <p className="text-sm text-muted-foreground">
        Development only. Every demo account&apos;s password is Talaan123!
      </p>
    </div>
  );
}
