import { createTransport } from "nodemailer";
import { isLiveServer } from "@/lib/env";

/** One plain-text email (Step 55.5). Text only: it delivers well, and needs no colors. */
export type EmailMessage = { to: string; subject: string; text: string };

/** Sent, or why not: a short code such as `EAUTH` or `ETIMEDOUT`, never the address. */
export type EmailResult = { ok: true } | { ok: false; error: string };

/**
 * Where emails go (Step 55.5), chosen by `EMAIL_SENDER`, so changing the
 * email provider is a setting, not new code: every provider speaks SMTP.
 * `send` never throws.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<EmailResult>;
}

/** What `createSmtpEmailSender` needs, from the SMTP_* settings and EMAIL_FROM. */
export type SmtpSettings = { host: string; port: number; user: string; password: string; from: string };

/** A hung connection gives up after this long, so a slow provider never holds the server. */
const SMTP_TIMEOUT_MS = 10_000;

/** The code nodemailer (or Node's network) puts on an error, or "unknown". */
function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "unknown";
}

/**
 * Sends through any SMTP provider (Resend, Brevo, Amazon SES). Port 465
 * opens with TLS; any other port (587) upgrades to it with STARTTLS.
 * `transport` is replaced only in tests.
 */
export function createSmtpEmailSender(settings: SmtpSettings, transport = createTransport): EmailSender {
  const mailer = transport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  return {
    async send(message) {
      try {
        await mailer.sendMail({ from: settings.from, to: message.to, subject: message.subject, text: message.text });
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorCode(error) };
      }
    },
  };
}

/**
 * Sends nothing. With `showBody` (development and the browser tests) it
 * writes the whole email to the terminal, so a reset link can be followed
 * without an email account. On a live server only the subject: the body
 * holds a live link, and the server's logs are kept.
 */
export function createLogEmailSender({ showBody }: { showBody: boolean }): EmailSender {
  return {
    async send(message) {
      console.info(
        showBody
          ? `email (log sender, not sent) to ${message.to}\nSubject: ${message.subject}\n\n${message.text}`
          : `email: 1 message to the log sender, not sent: ${message.subject}`,
      );
      return { ok: true };
    },
  };
}

/** `EMAIL_SENDER=smtp` sends for real; anything else logs. A live server must set it (`checkProductionEnv`). */
export function getEmailSender(env: NodeJS.ProcessEnv = process.env): EmailSender {
  if (env.EMAIL_SENDER !== "smtp") return createLogEmailSender({ showBody: !isLiveServer(env) });
  return createSmtpEmailSender({
    host: env.SMTP_HOST ?? "",
    port: Number(env.SMTP_PORT),
    user: env.SMTP_USER ?? "",
    password: env.SMTP_PASSWORD ?? "",
    from: env.EMAIL_FROM ?? "",
  });
}

/**
 * Whether an email can reach a person: true with SMTP, and off a live
 * server, where the log sender stands in. A live server still on "log"
 * keeps "Ask your principal" instead, so it never says "we've sent a
 * link" when nothing went.
 */
export function canEmailPeople(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.EMAIL_SENDER === "smtp" || !isLiveServer(env);
}

let shared: EmailSender | undefined;

/** The server's one sender, made on first use. */
export function emailSender(): EmailSender {
  shared ??= getEmailSender();
  return shared;
}
