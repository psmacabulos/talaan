import { z } from "zod";

/** One push, in the shape Expo's push service takes (Step 54). */
export type PushMessage = {
  to: string;
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

/** Expo's later answer for one ticket (Step 54.1): delivered to Apple or Google, or an error code. */
export type PushReceipt = { status: "ok" } | { status: "error"; error: string };

/** Receipts by ticket id. A ticket missing from `receipts` isn't ready yet, or was never Expo's. */
export type PushReceiptsResult = { ok: true; receipts: Record<string, PushReceipt> } | { ok: false; error: string };

/**
 * Where pushes go (Step 54), chosen by `PUSH_SENDER`, so changing the push
 * provider is a new sender and a setting, not new worker code.
 */
export interface PushSender {
  send(messages: PushMessage[]): Promise<PushSendResult>;
  /** Up to 1,000 tickets' receipts (Step 54.1). */
  getReceipts(ticketIds: string[]): Promise<PushReceiptsResult>;
}

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

/** Shorter than a claim (2 minutes), so a hung request never outlives its rows' claim. */
const SEND_TIMEOUT_MS = 30_000;

/** Receipts can always wait for the next check, so a slow answer isn't waited for long. */
const RECEIPTS_TIMEOUT_MS = 10_000;

const expoAnswerSchema = z.object({
  data: z.array(
    z.union([
      z.object({ status: z.literal("ok"), id: z.string() }),
      z.object({ status: z.literal("error"), details: z.object({ error: z.string().optional() }).optional() }),
    ]),
  ),
});

const expoReceiptsSchema = z.object({
  data: z.record(
    z.string(),
    z.union([
      z.object({ status: z.literal("ok") }),
      z.object({ status: z.literal("error"), details: z.object({ error: z.string().optional() }).optional() }),
    ]),
  ),
});

/** POSTs JSON to Expo, and names why a whole request failed: a timeout, the network, or an HTTP status. */
async function postToExpo(
  url: string,
  body: unknown,
  timeoutMs: number,
  accessToken: string | undefined,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // A timeout is a DOMException, which isn't an Error everywhere: check its name only.
    const timedOut = (error as { name?: unknown } | null)?.name === "TimeoutError";
    return { ok: false, error: timedOut ? "timeout" : "network" };
  }
  if (!response.ok) return { ok: false, error: `http_${response.status}` };
  return { ok: true, json: await response.json().catch(() => null) };
}

/**
 * Expo's push service: one HTTPS request for up to 100 messages, free.
 * With an access token (Expo's "enhanced push security"), only this server
 * can push to the app's phones. Errors are codes like `DeviceNotRegistered`,
 * never a token or a child's name.
 */
export function expoPushSender(accessToken?: string, fetchImpl: typeof fetch = fetch): PushSender {
  return {
    async send(messages) {
      const answer = await postToExpo(EXPO_PUSH_URL, messages, SEND_TIMEOUT_MS, accessToken, fetchImpl);
      if (!answer.ok) return answer;

      const parsed = expoAnswerSchema.safeParse(answer.json);
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
    async getReceipts(ticketIds) {
      const answer = await postToExpo(
        EXPO_RECEIPTS_URL,
        { ids: ticketIds },
        RECEIPTS_TIMEOUT_MS,
        accessToken,
        fetchImpl,
      );
      if (!answer.ok) return answer;

      // An answer with a top-level `errors` and no `data` fails this check, which is right: nothing was answered.
      const parsed = expoReceiptsSchema.safeParse(answer.json);
      if (!parsed.success) return { ok: false, error: "bad_answer" };
      const receipts: Record<string, PushReceipt> = {};
      for (const [id, receipt] of Object.entries(parsed.data.data)) {
        receipts[id] =
          receipt.status === "ok" ? { status: "ok" } : { status: "error", error: receipt.details?.error ?? "unknown" };
      }
      return { ok: true, receipts };
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
    async getReceipts(ticketIds) {
      return { ok: true, receipts: Object.fromEntries(ticketIds.map((id) => [id, { status: "ok" as const }])) };
    },
  };
}

/** `PUSH_SENDER=expo` sends for real; anything else logs. A live server must set it (`checkProductionEnv`). */
export function getPushSender(env: NodeJS.ProcessEnv = process.env): PushSender {
  return env.PUSH_SENDER === "expo" ? expoPushSender(env.EXPO_ACCESS_TOKEN) : logPushSender();
}
