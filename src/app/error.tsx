"use client";

import { ErrorPage } from "@/features/errors/error-page";

/**
 * The error page for every page under the root layout (Step 59.1): staff,
 * parent, sign-in, set-password and the gate alike. A failure in the root
 * layout itself is `global-error.tsx`'s.
 */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorPage error={error} retry={retry} />;
}
