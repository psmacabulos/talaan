"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-heading text-base font-semibold text-foreground">
          Something went wrong loading this page
        </p>
        <p className="text-sm text-muted-foreground">
          {error.digest ? `Reference: ${error.digest}. ` : ""}
          Try again — if it keeps happening, let us know what you were doing beforehand.
        </p>
      </div>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
