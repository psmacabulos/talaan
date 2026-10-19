import { z } from "zod";

/** One push, in the shape Expo's push service takes (Step 54). */
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { notificationId: string; childId: string };
  sound: "default";
  /** The parent app creates this Android channel before it registers its token. */
  channelId: "attendance";
  priority: "high";
};

/** Expo's answer for one message: accepted, with a ticket for Step 54.1's receipt, or refused with an error code. */
export type PushTicket = { status: "ok"; id: string } | { status: "error"; error: string };

/** One send: a ticket per message, in order, or why the whole request failed. */
export type PushSendResult = { ok: true; tickets: PushTicket[] } | { ok: false; error: string };

/**
 * Where pushes go (Step 54), chosen by `PUSH_SENDER`, so changing the push
 * provider is a new sender and a setting, not new worker code.
 */
export interface PushSender {
  send(messages: PushMessage[]): Promise<PushSendResult>;
}

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Shorter than a claim (2 minutes), so a hung request never outlives its rows' claim. */
const SEND_TIMEOUT_MS = 30_000;

const expoAnswerSchema = z.object({
  data: z.array(
    z.union([
      z.object({ status: z.literal("ok"), id: z.string() }),
      z.object({ status: z.literal("error"), details: z.object({ error: z.string().optional() }).optional() }),
    ]),
  ),
});

/**
 * Expo's push service: one HTTPS request for up to 100 messages, free.
 * With an access token (Expo's "enhanced push security"), only this server
 * can push to the app's phones. Errors are codes like `DeviceNotRegistered`,
 * never a token or a child's name.
 */
export function expoPushSender(accessToken?: string, fetchImpl: typeof fetch = fetch): PushSender {
  return {
    async send(messages) {
      let response: Response;
      try {
        response = await fetchImpl(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(messages),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });
      } catch (error) {
        // A timeout is a DOMException, which isn't an Error everywhere: check its name only.
        const timedOut = (error as { name?: unknown } | null)?.name === "TimeoutError";
        return { ok: false, error: timedOut ? "timeout" : "network" };
      }
      if (!response.ok) return { ok: false, error: `http_${response.status}` };

      const parsed = expoAnswerSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success || parsed.data.data.length !== messages.length) return { ok: false, error: "bad_answer" };
      return {
        ok: true,
        tickets: parsed.data.data.map((ticket) =>
          ticket.status === "ok"
            ? { status: "ok", id: ticket.id }
            : { status: "error", error: ticket.details?.error ?? "unknown" },
        ),
      };
    },
  };
}

/**
 * Sends nothing: logs how many pushes would have gone, never to whom, and
 * accepts each with a `log-` ticket. For development, the browser tests,
 * and a live server until the parent app can receive pushes.
 */
export function logPushSender(): PushSender {
  return {
    async send(messages) {
      console.info(`push: ${messages.length} message(s) to the log sender, none sent`);
      return { ok: true, tickets: messages.map(() => ({ status: "ok", id: `log-${crypto.randomUUID()}` })) };
    },
  };
}

/** `PUSH_SENDER=expo` sends for real; anything else logs. A live server must set it (`checkProductionEnv`). */
export function getPushSender(env: NodeJS.ProcessEnv = process.env): PushSender {
  return env.PUSH_SENDER === "expo" ? expoPushSender(env.EXPO_ACCESS_TOKEN) : logPushSender();
}
