"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/error-screen";

/** The error page (Step 59.1) with a pretend report, so each dialog state can be seen: sending, then sent or failed. */
export function ErrorScreenPreview() {
  const [reportFails, setReportFails] = useState(false);

  function pretendToSend() {
    return new Promise<void>((resolve, reject) =>
      setTimeout(() => (reportFails ? reject(new Error("Pretend failure")) : resolve()), 1_200),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant={reportFails ? "outline" : "default"} size="sm" onClick={() => setReportFails(false)}>
          Report succeeds
        </Button>
        <Button variant={reportFails ? "default" : "outline"} size="sm" onClick={() => setReportFails(true)}>
          Report fails
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <ErrorScreen reference="3f9a1c2b" onRetry={() => undefined} onReport={pretendToSend} showThemeToggle={false} />
      </div>
    </div>
  );
}
