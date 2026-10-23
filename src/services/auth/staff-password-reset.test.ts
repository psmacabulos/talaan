import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockStaffRepository } from "@/data/repositories/staff-repository";
import type { Staff } from "@/features/staff/types";
import type { EmailMessage, EmailSender } from "@/lib/email/email-sender";
import { createLoginThrottle } from "./login-throttle";
import { readSetPasswordToken } from "./set-password-link";
import { startStaffPasswordReset } from "./staff-password-reset";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = new Date("2026-10-23T08:00:00Z");
const APP_URL = "https://bantayaral.herokuapp.com";
const HOUR = 60 * 60_000;

const active: Staff = {
  id: "staff-ana",
  schoolId: "school-a",
  role: "teacher",
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana.reyes@school-a.example",
  status: "active",
};
const invited: Staff = { ...active, id: "staff-new", email: "new@school-a.example", status: "invited" };

async function setup(sendImpl: EmailSender["send"] = async () => ({ ok: true })) {
  const staff = createMockStaffRepository([{ ...active }, { ...invited }], { latencyMs: 0 });
  await staff.setPassword(active.id, "scrypt:old:hash");
  const send = vi.fn(sendImpl);
  const deps = {
    staff,
    sender: { send },
    secret: SECRET,
    appUrl: APP_URL,
    now: NOW,
    emailThrottle: createLoginThrottle({ maxFailures: 3, windowMs: HOUR }),
    addressThrottle: createLoginThrottle({ maxFailures: 20, windowMs: HOUR }),
    dailyCap: createLoginThrottle({ maxFailures: 80, windowMs: 24 * HOUR }),
  };
  return { staff, send, deps };
}

/** Starts a reset and, like `after()`, runs its send once the answer is in. */
async function requestReset(email: string, deps: Awaited<ReturnType<typeof setup>>["deps"], address = "203.0.113.7") {
  const result = startStaffPasswordReset(email, address, deps);
  if (result.outcome === "accepted") await result.send();
  return result.outcome;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startStaffPasswordReset (Step 55.5)", () => {
  it("emails an active account a 1-hour link on APP_URL that opens for them", async () => {
    const { send, deps, staff } = await setup();
    await expect(requestReset(active.email, deps)).resolves.toBe("accepted");

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0] as EmailMessage;
    expect(message).toMatchObject({ to: active.email, subject: "Reset your Bantay Aral password" });
    expect(message.text).toContain("Hi Ana,");
    const link = message.text.match(/https:\/\/\S+/)![0];
    expect(link.startsWith(`${APP_URL}/set-password?token=`)).toBe(true);

    const token = new URL(link).searchParams.get("token")!;
    const readAt = (ms: number) => readSetPasswordToken(token, { staff, secret: SECRET, now: new Date(NOW.getTime() + ms) });
    await expect(readAt(0)).resolves.toMatchObject({ id: active.id });
    await expect(readAt(HOUR)).resolves.toBeNull();
  });

  it("gives an unknown email and an invited account the same answer, and sends them nothing", async () => {
    const { send, deps } = await setup();
    await expect(requestReset("nobody@school-a.example", deps)).resolves.toBe("accepted");
    await expect(requestReset(invited.email, deps)).resolves.toBe("accepted");
    expect(send).not.toHaveBeenCalled();
  });

  it("allows 3 requests per email in an hour, known or not", async () => {
    const { deps } = await setup();
    for (const email of [active.email, "nobody@school-a.example"]) {
      for (let i = 0; i < 3; i += 1) await expect(requestReset(email, deps)).resolves.toBe("accepted");
      await expect(requestReset(email, deps)).resolves.toBe("too_many");
    }
  });

  it("allows 20 requests per network in an hour, whatever the emails", async () => {
    const { deps } = await setup();
    for (let i = 0; i < 20; i += 1) await requestReset(`person-${i}@school-a.example`, deps);
    await expect(requestReset("one-more@school-a.example", deps)).resolves.toBe("too_many");
    await expect(requestReset("one-more@school-a.example", deps, "198.51.100.1")).resolves.toBe("accepted");
  });

  it("stops at the daily email limit, which counts only emails sent", async () => {
    const { send, deps } = await setup();
    deps.dailyCap = createLoginThrottle({ maxFailures: 1, windowMs: 24 * HOUR });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await requestReset("nobody@school-a.example", deps);
    await expect(requestReset(active.email, deps)).resolves.toBe("accepted");
    expect(send).toHaveBeenCalledTimes(1);
    await expect(requestReset(active.email, deps)).resolves.toBe("unavailable");
  });

  it("logs a failed send with its code, never the address, and never throws", async () => {
    const { deps } = await setup(async () => ({ ok: false, error: "EAUTH" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await requestReset(active.email, deps);
    const written = log.mock.calls.flat().join(" ");
    expect(written).toContain("EAUTH");
    expect(written).not.toContain("ana.reyes");
  });
});
