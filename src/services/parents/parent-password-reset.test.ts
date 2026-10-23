import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockParentRepository } from "@/data/repositories/parent-repository";
import { createMockParentPasswordResetRepository } from "@/data/repositories/parent-password-reset-repository";
import { RESET_CODE_INVALID_MESSAGE } from "@/features/auth/messages";
import type { Parent } from "@/features/parents/types";
import type { EmailMessage, EmailSender } from "@/lib/email/email-sender";
import { passwordMatches } from "@/lib/password";
import { createLoginThrottle, parentThrottleKey } from "@/services/auth/login-throttle";
import { confirmParentPasswordReset, startParentPasswordReset } from "./parent-password-reset";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = new Date("2026-10-23T08:00:00Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NEW_PASSWORD = "a-new-password-1";

const maria: Parent = {
  id: "parent-maria",
  firstName: "Maria",
  lastName: "Santos",
  mobile: "09171234567",
  email: "maria@example.com",
};

function setup(sendImpl: EmailSender["send"] = async () => ({ ok: true })) {
  const completed: { parentId: string; passwordHash: string }[] = [];
  const resets = createMockParentPasswordResetRepository({
    onComplete: async (parentId, passwordHash) => {
      completed.push({ parentId, passwordHash });
    },
  });
  const send = vi.fn(sendImpl);
  const shared = {
    parents: createMockParentRepository([{ ...maria }], { latencyMs: 0 }),
    resets,
    sender: { send },
    secret: SECRET,
    dailyCap: createLoginThrottle({ maxFailures: 80, windowMs: 24 * HOUR }),
  };
  const start = {
    ...shared,
    canEmail: true,
    now: NOW,
    emailThrottle: createLoginThrottle({ maxFailures: 3, windowMs: HOUR }),
    addressThrottle: createLoginThrottle({ maxFailures: 20, windowMs: HOUR }),
  };
  const confirm = {
    ...shared,
    signInThrottle: createLoginThrottle({ maxFailures: 5, windowMs: 15 * MINUTE }),
    addressThrottle: createLoginThrottle({ maxFailures: 30, windowMs: 15 * MINUTE }),
    address: "203.0.113.7",
    now: NOW,
  };
  return { send, resets, completed, start, confirm };
}

type Setup = ReturnType<typeof setup>;

/** Asks for a code and, like `after()`, runs its send once the answer is in. */
async function requestCode(email: string, start: Setup["start"], address = "203.0.113.7") {
  const result = startParentPasswordReset(email, address, start);
  if (result.outcome === "accepted") await result.send();
  return result.outcome;
}

/** The code in the newest email sent. */
function lastCode(send: Setup["send"]): string {
  const message = send.mock.calls.at(-1)![0] as EmailMessage;
  return message.text.match(/^\d{6}$/m)![0];
}

function confirmWith(code: string, confirm: Setup["confirm"], email = maria.email) {
  return confirmParentPasswordReset({ email, code, password: NEW_PASSWORD }, confirm);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startParentPasswordReset (Step 55.6)", () => {
  it("emails a known parent a 6-digit code, stored only as a hash", async () => {
    const { send, resets, start } = setup();
    await expect(requestCode(maria.email, start)).resolves.toBe("accepted");

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0] as EmailMessage;
    expect(message).toMatchObject({ to: maria.email, subject: "Your Bantay Aral password reset code" });
    expect(message.subject).not.toMatch(/\d{6}/);
    expect(message.text).toContain("Hi Maria,");
    expect(message.text).toContain("15 minutes");
    const code = lastCode(send);
    expect(resets.rows).toHaveLength(1);
    expect(JSON.stringify(resets.rows)).not.toContain(code);
    expect(resets.rows[0].expiresAt).toBe(new Date(NOW.getTime() + 15 * MINUTE).toISOString());
  });

  it("gives an unknown email the same answer, and sends nothing", async () => {
    const { send, resets, start } = setup();
    await expect(requestCode("nobody@example.com", start)).resolves.toBe("accepted");
    expect(send).not.toHaveBeenCalled();
    expect(resets.rows).toHaveLength(0);
  });

  it("allows 3 requests per email and 20 per network in an hour, known or not", async () => {
    const { start } = setup();
    for (const email of [maria.email, "nobody@example.com"]) {
      for (let i = 0; i < 3; i += 1) await expect(requestCode(email, start)).resolves.toBe("accepted");
      await expect(requestCode(email, start)).resolves.toBe("too_many");
    }
    for (let i = 0; i < 14; i += 1) await requestCode(`person-${i}@example.com`, start);
    await expect(requestCode("one-more@example.com", start)).resolves.toBe("too_many");
    await expect(requestCode("one-more@example.com", start, "198.51.100.1")).resolves.toBe("accepted");
  });

  it("sends at most 5 codes a day to one parent, whatever restarts clear", async () => {
    const { send, start } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let i = 0; i < 6; i += 1) {
      // A fresh in-memory limit each time, as after a restart.
      start.emailThrottle = createLoginThrottle({ maxFailures: 3, windowMs: HOUR });
      await requestCode(maria.email, start);
    }
    expect(send).toHaveBeenCalledTimes(5);

    start.now = new Date(NOW.getTime() + 25 * HOUR);
    await requestCode(maria.email, start);
    expect(send).toHaveBeenCalledTimes(6);
  });

  it("is unavailable when no email can go, or the day's emails are used up", async () => {
    const { send, start } = setup();
    await expect(requestCode(maria.email, { ...start, canEmail: false })).resolves.toBe("unavailable");
    start.dailyCap = createLoginThrottle({ maxFailures: 1, windowMs: 24 * HOUR });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await requestCode(maria.email, start);
    await expect(requestCode(maria.email, start)).resolves.toBe("unavailable");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("logs a failed send with its code, never the address or the code", async () => {
    const { send, start } = setup(async () => ({ ok: false, error: "EAUTH" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await requestCode(maria.email, start);
    const written = log.mock.calls.flat().join(" ");
    expect(written).toContain("parent reset code failed: EAUTH");
    expect(written).not.toContain("maria");
    expect(written).not.toContain(lastCode(send));
  });
});

describe("confirmParentPasswordReset (Step 55.6)", () => {
  it("sets the new password with the right code, once, and clears the sign-in lockout", async () => {
    const { send, completed, start, confirm } = setup();
    await requestCode(maria.email, start);
    const code = lastCode(send);
    const lockout = parentThrottleKey(maria.email);
    for (let i = 0; i < 5; i += 1) confirm.signInThrottle.recordFailure(lockout, NOW.getTime());

    const result = await confirmWith(` ${code} `, confirm, " MARIA@example.com ");
    expect(result).toMatchObject({ ok: true, parent: { id: maria.id } });
    expect(completed).toHaveLength(1);
    await expect(passwordMatches(NEW_PASSWORD, completed[0].passwordHash)).resolves.toBe(true);
    expect(confirm.signInThrottle.isLocked(lockout, NOW.getTime())).toBe(false);

    await expect(confirmWith(code, confirm)).resolves.toMatchObject({ ok: false, code: "invalid_code" });
  });

  it("emails 'Your password was changed' only when the caller sends it", async () => {
    const { send, start, confirm } = setup();
    await requestCode(maria.email, start);
    const result = await confirmWith(lastCode(send), confirm);
    expect(send).toHaveBeenCalledTimes(1);
    if (!result.ok) throw new Error("expected a reset");
    await result.notify();
    expect(send.mock.calls[1][0]).toMatchObject({ to: maria.email, subject: "Your Bantay Aral password was changed" });
  });

  it("gives one answer for a wrong code, an unknown email, and no code at all", async () => {
    const { send, start, confirm } = setup();
    const invalid = { ok: false, code: "invalid_code", formError: RESET_CODE_INVALID_MESSAGE };
    await expect(confirmWith("123456", confirm)).resolves.toEqual(invalid);
    await requestCode(maria.email, start);
    const wrong = lastCode(send) === "000000" ? "000001" : "000000";
    await expect(confirmWith(wrong, confirm)).resolves.toEqual(invalid);
    await expect(confirmWith(lastCode(send), confirm, "nobody@example.com")).resolves.toEqual(invalid);
  });

  it("stops a code after 5 tries, even the right one", async () => {
    const { send, completed, start, confirm } = setup();
    await requestCode(maria.email, start);
    const code = lastCode(send);
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i += 1) await confirmWith(wrong, confirm);
    await expect(confirmWith(code, confirm)).resolves.toMatchObject({ ok: false, code: "invalid_code" });
    expect(completed).toHaveLength(0);
  });

  it("refuses a code after 15 minutes, and an older code once a newer one is sent", async () => {
    const { send, start, confirm } = setup();
    await requestCode(maria.email, start);
    const first = lastCode(send);
    await expect(confirmWith(first, { ...confirm, now: new Date(NOW.getTime() + 15 * MINUTE) })).resolves.toMatchObject(
      { ok: false, code: "invalid_code" },
    );

    await requestCode(maria.email, { ...start, now: new Date(NOW.getTime() + MINUTE) });
    const second = lastCode(send);
    if (first !== second) {
      await expect(confirmWith(first, confirm)).resolves.toMatchObject({ ok: false, code: "invalid_code" });
    }
    await expect(confirmWith(second, confirm)).resolves.toMatchObject({ ok: true });
  });

  it("checks the code and the new password's length", async () => {
    const { confirm } = setup();
    await expect(
      confirmParentPasswordReset({ email: maria.email, code: "12", password: "short" }, confirm),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_input",
      fieldErrors: { code: "Enter the 6-digit code from the email", password: "Use at least 8 characters" },
    });
  });

  it("counts wrong codes against the network, with wrong passwords", async () => {
    const { confirm } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let i = 0; i < 30; i += 1) await confirmWith("123456", confirm, `person-${i}@example.com`);
    await expect(confirmWith("123456", confirm)).resolves.toMatchObject({ ok: false, code: "too_many_tries" });
  });
});
