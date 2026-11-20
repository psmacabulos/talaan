"use client";

import { useEffect, useState } from "react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { canSendProblemReports, reportBrowserError, sendBrowserProblemReport } from "@/lib/browser-error-reporting";
import { errorReference } from "./error-reference";
import { ErrorScreen } from "./error-screen";

/**
 * What `error.tsx` and `global-error.tsx` both render (Step 59.1): works out
 * the reference code, reports a browser error (a server error was reported
 * by the server already), and shows the one error page.
 *
 * A page opened before a deploy asks the new server for a server action by
 * the old release's ID, and Next.js throws `UnrecognizedActionError` (P-062,
 * version skew). That isn't a bug, so it isn't reported: the page says the
 * app was updated, and its one button reloads, which "Try again" can't fix.
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
  const updated = unstable_isUnrecognizedActionError(error);

  useEffect(() => {
    console.error(error);
    // A caught error never reaches Sentry by itself (Step 59).
    if (!updated) reportBrowserError(error, reference);
  }, [error, reference, updated]);

  if (updated) {
    return <ErrorScreen kind="updated" onRetry={() => window.location.reload()} showThemeToggle={showThemeToggle} />;
  }

  return (
    <ErrorScreen
      reference={reference}
      onRetry={retry}
      onReport={canSendProblemReports() ? (note) => sendBrowserProblemReport({ note, reference }) : undefined}
      showThemeToggle={showThemeToggle}
    />
  );
}
