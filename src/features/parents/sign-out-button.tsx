"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutParent } from "./auth-actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => signOutParent())}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      Sign out
    </Button>
  );
}
