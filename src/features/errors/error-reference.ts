/**
 * The short code an error page shows, so a person's report and the error's
 * own report can be matched in Sentry with one search, `digest:<code>`
 * (Step 59.1). A server error already has Next.js's `digest`, which its
 * report is tagged with (`reportRequestError`); a browser error gets a new
 * 8-character code, tagged the same way when it's reported.
 */
export function errorReference(error: unknown): string {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string" && error.digest) {
    return error.digest;
  }
  // Not `randomUUID`, which only exists on https or localhost: a tablet on
  // the school's network over plain http must still get a code.
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
