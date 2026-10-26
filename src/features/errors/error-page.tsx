"use client";

import { useEffect, useState } from "react";
import { canSendProblemReports, reportBrowserError, sendBrowserProblemReport } from "@/lib/browser-error-reporting";
import { errorReference } from "./error-reference";
import { ErrorScreen } from "./error-screen";

/**
 * What `error.tsx` and `global-error.tsx` both render (Step 59.1): works out
 * the reference code, reports a browser error (a server error was reported
 * by the server already), and shows the one error page.
 */
export function ErrorPage({
  error,
  retry,
  showThemeToggle,
}: {
  error: unknown;
  retry: () => void;
  showThemeToggle?: boolean;
}) {
  // A new error (Try again failed differently) gets its own code.
  const [current, setCurrent] = useState(() => ({ error, reference: errorReference(error) }));
  if (current.error !== error) setCurrent({ error, reference: errorReference(error) });
  const { reference } = current;

  useEffect(() => {
    console.error(error);
    // A caught error never reaches Sentry by itself (Step 59).
    reportBrowserError(error, reference);
  }, [error, reference]);

  return (
    <ErrorScreen
      reference={reference}
      onRetry={retry}
      onReport={canSendProblemReports() ? (note) => sendBrowserProblemReport({ note, reference }) : undefined}
      showThemeToggle={showThemeToggle}
    />
  );
}
