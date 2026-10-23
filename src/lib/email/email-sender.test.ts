import { afterEach, describe, expect, it, vi } from "vitest";
import type { createTransport } from "nodemailer";
import { canEmailPeople, createLogEmailSender, createSmtpEmailSender, getEmailSender } from "./email-sender";

const MESSAGE = {
  to: "ana.reyes@school.example",
  subject: "Reset your Bantay Aral password",
  text: "https://bantayaral.herokuapp.com/set-password?token=live-link",
};

const SETTINGS = { host: "smtp.resend.com", port: 465, user: "resend", password: "re_key", from: "Bantay Aral <a@b.c>" };

/** A stand-in for nodemailer's `createTransport` whose `sendMail` does what `sendMail` says. */
function fakeTransport(sendMail: () => Promise<unknown>) {
  const create = vi.fn(() => ({ sendMail: vi.fn(sendMail) }));
  return create as unknown as typeof createTransport & typeof create;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLogEmailSender (Step 55.5)", () => {
  it("writes only the subject on a live server, never the link", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(createLogEmailSender({ showBody: false }).send(MESSAGE)).resolves.toEqual({ ok: true });
    const written = log.mock.calls.flat().join(" ");
    expect(written).toContain("Reset your Bantay Aral password");
    expect(written).not.toContain("live-link");
    expect(written).not.toContain("ana.reyes");
  });

  it("writes the whole email in development, so the link can be followed", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await createLogEmailSender({ showBody: true }).send(MESSAGE);
    expect(log.mock.calls.flat().join(" ")).toContain("live-link");
  });
});

describe("createSmtpEmailSender", () => {
  it("connects with TLS and a 10-second limit, and sends from EMAIL_FROM", async () => {
    const transport = fakeTransport(async () => ({}));
    await expect(createSmtpEmailSender(SETTINGS, transport).send(MESSAGE)).resolves.toEqual({ ok: true });

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: "re_key" },
        connectionTimeout: 10_000,
        socketTimeout: 10_000,
      }),
    );
    const mailer = transport.mock.results[0].value as { sendMail: ReturnType<typeof vi.fn> };
    expect(mailer.sendMail).toHaveBeenCalledWith({ from: "Bantay Aral <a@b.c>", ...MESSAGE });
  });

  it("upgrades to TLS on port 587 instead of opening with it", () => {
    const transport = fakeTransport(async () => ({}));
    createSmtpEmailSender({ ...SETTINGS, port: 587 }, transport);
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ secure: false }));
  });

  it("answers a failure with its code, never throwing or naming the address", async () => {
    const transport = fakeTransport(async () => {
      throw Object.assign(new Error("Invalid login for ana.reyes@school.example"), { code: "EAUTH" });
    });
    await expect(createSmtpEmailSender(SETTINGS, transport).send(MESSAGE)).resolves.toEqual({
      ok: false,
      error: "EAUTH",
    });
  });
});

describe("getEmailSender and canEmailPeople", () => {
  it("logs unless EMAIL_SENDER is smtp", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await getEmailSender({ NODE_ENV: "production" }).send(MESSAGE);
    expect(log.mock.calls.flat().join(" ")).not.toContain("live-link");
  });

  it("emails people with SMTP, and anywhere but a live server", () => {
    expect(canEmailPeople({ NODE_ENV: "production", EMAIL_SENDER: "smtp" })).toBe(true);
    expect(canEmailPeople({ NODE_ENV: "production", EMAIL_SENDER: "log" })).toBe(false);
    expect(canEmailPeople({ NODE_ENV: "production", E2E: "1" })).toBe(true);
    expect(canEmailPeople({ NODE_ENV: "development" })).toBe(true);
  });
});
