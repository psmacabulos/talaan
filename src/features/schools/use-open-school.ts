"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { openSchool } from "./actions";

/**
 * "Open" for one school, shared by the desktop table's button and the phone
 * card (Step 27.8), so the two can't behave differently. On success
 * `openSchool` redirects to /dashboard as that school's principal, so the
 * promise never settles and only a failure shows a toast here.
 */
export function useOpenSchool(schoolId: string) {
  const [isPending, startTransition] = useTransition();

  function open() {
    startTransition(async () => {
      const result = await openSchool(schoolId);
      if (!result.ok) toast.error(result.formError);
    });
  }

  return { isPending, open };
}
