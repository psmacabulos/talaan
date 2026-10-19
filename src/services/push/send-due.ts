import type { DeliveryResult, DueDelivery, PushOutboxRepository } from "@/data/repositories/push-outbox-repository";
import { toPushMessage } from "./push-message";
import type { PushSender, PushTicket } from "./push-sender";

/** Expo takes at most 100 messages a request. */
export const PUSH_BATCH = 100;

/** A claimed delivery is "sending" this long; past it, a worker that died mid-send gives the row back. */
export const CLAIM_MS = 2 * 60_000;

/** A notification older than this isn't pushed, and a failing push gives up. It's always in the feed. */
export const GIVE_UP_AFTER_MS = 6 * 60 * 60_000;

const FIRST_RETRY_MS = 30_000;
const MAX_RETRY_MS = 30 * 60_000;

/** 30 s, 1 min, 2 min… at most 30 minutes between tries. */
export function retryDelayMs(tries: number): number {
  return Math.min(FIRST_RETRY_MS * 2 ** tries, MAX_RETRY_MS);
}

export type SendAnswer = { ok: true; ticket: PushTicket } | { ok: false; error: string };

/**
 * What one answer means for one delivery (Step 54):
 * - accepted: sent, with Expo's ticket;
 * - `DeviceNotRegistered`: the app is gone from that phone, so its push address goes;
 * - `MessageTooBig`: sending again can't help;
 * - a rate limit: again in 30 seconds, not counted as a try;
 * - anything else (a timeout, a server error): again later, waiting longer each time;
 * - after 6 hours: failed.
 */
export function resultFor(delivery: DueDelivery, answer: SendAnswer): DeliveryResult {
  if (answer.ok && answer.ticket.status === "ok") {
    return { id: delivery.id, outcome: "sent", ticketId: answer.ticket.id };
  }

  const error = answer.ok ? (answer.ticket.status === "error" ? answer.ticket.error : "unknown") : answer.error;
  if (error === "DeviceNotRegistered") return { id: delivery.id, outcome: "gone", pushTokenId: delivery.pushTokenId };
  if (error === "MessageTooBig" || delivery.ageMs >= GIVE_UP_AFTER_MS) {
    return { id: delivery.id, outcome: "failed", error };
  }
  const rateLimited = error === "MessageRateExceeded" || error === "http_429";
  return {
    id: delivery.id,
    outcome: "retry",
    retryInMs: rateLimited ? FIRST_RETRY_MS : retryDelayMs(delivery.tries),
    countsAsTry: !rateLimited,
    error,
  };
}

export type PushDeps = { outbox: PushOutboxRepository; sender: PushSender };

/** Claims one batch of due deliveries, sends it in one request, and saves every result in one write. */
export async function sendDue(deps: PushDeps): Promise<DeliveryResult[]> {
  const due = await deps.outbox.claimDue(PUSH_BATCH, CLAIM_MS);
  if (due.length === 0) return [];

  const sent = await deps.sender.send(due.map(toPushMessage));
  const results = due.map((delivery, index) =>
    resultFor(delivery, sent.ok ? { ok: true, ticket: sent.tickets[index] } : sent),
  );
  await deps.outbox.saveResults(results);
  return results;
}
