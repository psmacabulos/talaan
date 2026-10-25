import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { IGNORED_ERRORS, scrubEvent, sentryOptions } from "./error-reporting";

/** A report as the SDK would hand it to `beforeSend`, carrying everything that must not leave. */
function fullReport(): ErrorEvent {
  return {
    type: undefined,
    message: undefined,
    user: { id: "staff-1", email: "principal@school.example", ip_address: "203.0.113.7" },
    server_name: "PatMacabulos.local",
    contexts: { nextjs: { request_path: "/students?q=Juan", router_path: "/students" } },
    extra: { student: "Juan Dela Cruz" },
    breadcrumbs: [{ category: "ui.click", message: 'button[aria-label="Edit Juan Dela Cruz"]' }],
    request: {
      url: "https://bantayaral.com/students?q=Juan",
      method: "POST",
      data: { firstName: "Juan", guardianMobile: "09171234567" },
      cookies: { talaan_session: "secret" },
      headers: { cookie: "talaan_session=secret" },
      query_string: "q=Juan",
    },
    exception: {
      values: [
        {
          type: "PrismaClientValidationError",
          value: 'Invalid `prisma.student.create()` invocation: { firstName: "Juan" }',
          stacktrace: {
            frames: [
              {
                filename: "https://bantayaral.com/_next/static/chunks/app.js?v=1",
                abs_path: "https://bantayaral.com/_next/static/chunks/app.js?v=1",
                lineno: 10,
                vars: { name: "Juan Dela Cruz" },
              },
            ],
          },
        },
        {
          type: "Error",
          value: "Tap writer failed",
          stacktrace: { frames: [{ filename: "record-tap.ts", lineno: 3 }] },
        },
      ],
    },
  };
}

describe("scrubEvent (Step 59)", () => {
  const scrubbed = scrubEvent(fullReport());

  it("keeps only the request's address, without its query, and its method", () => {
    expect(scrubbed.request).toEqual({ url: "https://bantayaral.com/students", method: "POST" });
  });

  it("strips the query from Next.js's own copy of the address", () => {
    expect(scrubbed.contexts?.nextjs).toEqual({ request_path: "/students", router_path: "/students" });
  });

  it("drops the user, extra data, breadcrumbs and the machine's name", () => {
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expect(scrubbed.breadcrumbs).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
  });

  it("replaces a database error's message, which can quote the data, with its type", () => {
    expect(scrubbed.exception?.values?.[0].value).toBe("PrismaClientValidationError");
  });

  it("strips variable values and queries from stack frames, and keeps a plain error as it is", () => {
    const [frame] = scrubbed.exception?.values?.[0].stacktrace?.frames ?? [];
    expect(frame).toEqual({
      filename: "https://bantayaral.com/_next/static/chunks/app.js",
      abs_path: "https://bantayaral.com/_next/static/chunks/app.js",
      lineno: 10,
    });
    expect(scrubbed.exception?.values?.[1]).toEqual(fullReport().exception?.values?.[1]);
  });

  it("leaves no name, email, mobile, cookie or IP address anywhere in the report", () => {
    const text = JSON.stringify(scrubbed);
    for (const secret of ["Juan", "principal@", "0917", "secret", "203.0.113"]) expect(text).not.toContain(secret);
  });
});

describe("sentryOptions (Step 59)", () => {
  const options = sentryOptions("https://key@o1.ingest.sentry.io/1");

  it("switches off every data category Sentry collects by default", () => {
    expect(options.dataCollection).toEqual({
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
    });
  });

  it("keeps no breadcrumbs, ignores no-connection noise, and scrubs every report", () => {
    expect(options.maxBreadcrumbs).toBe(0);
    expect(IGNORED_ERRORS).toContain("Failed to fetch");
    expect(IGNORED_ERRORS.some((pattern) => pattern instanceof RegExp && pattern.test("Tap failed: 500"))).toBe(true);
    expect(JSON.stringify(options.beforeSend(fullReport()))).not.toContain("Juan");
  });
});
