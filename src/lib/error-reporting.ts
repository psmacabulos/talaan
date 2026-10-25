import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent, Event, StackFrame } from "@sentry/nextjs";

/**
 * Error reports, through Sentry (Step 59, docs/ERROR-TRACKING.md). The one
 * module that knows Sentry: the browser and the server both start it from
 * here, and error pages report through it. Students are minors, so a
 * report carries only what finds the bug, never what identifies a person:
 * every data category Sentry collects by default is switched off, and
 * `scrubEvent` cleans each report once more before it leaves.
 */

/**
 * Noise, not bugs: no connection, mostly from the gate tablet while the
 * school's internet is down (Step 58). Each would be a report, and one
 * offline tablet could use up the month's 5,000.
 */
export const IGNORED_ERRORS: (string | RegExp)[] = [
  "Failed to fetch",
  "Load failed",
  "NetworkError when attempting to fetch resource",
  /^(Check-in|Roster|Tap) failed/,
];

/** Everything after `?` or `#` in an address: search text (`?q=Juan`) and links' tokens live there. */
function withoutQuery(url: string | undefined): string | undefined {
  return url?.replace(/[?#].*$/, "");
}

function scrubFrame(frame: StackFrame): StackFrame {
  const scrubbed: StackFrame = {
    ...frame,
    filename: withoutQuery(frame.filename),
    abs_path: withoutQuery(frame.abs_path),
  };
  delete scrubbed.vars;
  return scrubbed;
}

/**
 * The last clean before a report leaves (`beforeSend`): the request keeps
 * only its address (no query) and method; the user, extra data,
 * breadcrumbs and the machine's name go; stack frames lose any variable values and queries; and a
 * database error's message, which can quote the data it was saving, is
 * replaced by its type.
 */
export function scrubEvent<T extends Event>(event: T): T {
  const { request, exception } = event;
  const scrubbed: T = { ...event };
  delete scrubbed.user;
  delete scrubbed.extra;
  delete scrubbed.breadcrumbs;
  delete scrubbed.server_name;
  delete scrubbed.request;
  delete scrubbed.exception;
  if (request) scrubbed.request = { url: withoutQuery(request.url), method: request.method };
  // Next.js's own context repeats the address (Sentry already filters it; a second guard).
  const nextjs = event.contexts?.nextjs;
  if (nextjs && typeof nextjs.request_path === "string") {
    scrubbed.contexts = { ...event.contexts, nextjs: { ...nextjs, request_path: withoutQuery(nextjs.request_path) } };
  }
  if (exception && !exception.values) scrubbed.exception = exception;
  if (exception?.values) {
    scrubbed.exception = {
      ...exception,
      values: exception.values.map((value) => ({
        ...value,
        value: value.type?.startsWith("PrismaClient") ? value.type : value.value,
        stacktrace: value.stacktrace?.frames
          ? { ...value.stacktrace, frames: value.stacktrace.frames.map(scrubFrame) }
          : value.stacktrace,
      })),
    };
  }
  return scrubbed;
}

/** Sentry's settings, the same in the browser and on the server. */
export function sentryOptions(dsn: string) {
  return {
    dsn,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    },
    // Clicks and page visits record button labels, photo descriptions and
    // search addresses, which can hold a student's name (Step 59's review).
    maxBreadcrumbs: 0,
    ignoreErrors: IGNORED_ERRORS,
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
  };
}

/**
 * Starts reporting, once, and only in a production build: without
 * `NEXT_PUBLIC_SENTRY_DSN` (the tests, CI), or under `npm run dev` even with
 * one, nothing starts and nothing is sent, so the live project only ever
 * sees the live site's errors.
 */
export function startErrorReporting(dsn: string | undefined): void {
  if (!dsn || process.env.NODE_ENV !== "production" || Sentry.getClient()) return;
  Sentry.init(sentryOptions(dsn));
}

/** For error pages: an error a page's error boundary caught, which Sentry wouldn't see by itself. */
export function reportError(error: unknown): void {
  Sentry.captureException(error);
}

/** Waits up to `timeoutMs` for reports still on their way, before the server gives up on starting. */
export async function flushReports(timeoutMs: number): Promise<void> {
  await Sentry.flush(timeoutMs);
}

/**
 * Next.js's hook for every server error in a page, an action or an API
 * route (`onRequestError` in instrumentation.ts). Tagged with the error's
 * `digest`, the reference an error page can show, so a page and its report
 * can be matched (Step 59.1).
 */
export function reportRequestError(...args: Parameters<typeof Sentry.captureRequestError>): void {
  const [error] = args;
  const digest = typeof error === "object" && error !== null && "digest" in error ? error.digest : undefined;
  Sentry.withScope((scope) => {
    if (typeof digest === "string") scope.setTag("digest", digest);
    Sentry.captureRequestError(...args);
  });
}
