import type { DeliveryResult, DueDelivery, PushOutboxRepository } from "@/data/repositories/push-outbox-repository";
import { toPushMessage } from "./push-message";
import type { PushSender, PushTicket } from "./push-sender";

/** Expo takes at most 100 messages a request. */
export const PUSH_BATCH = 100;

/** A claimed delivery is "sending" this long; past it, a worker that died mid-send gives the row back. */
export const CLAIM_MS = 2 * 60_000;

/** A notification older than this isn't pushed, and a failing push gives up. It's always in the feed. */
export const GIVE_UP_AFTER_MS = 6 * 60 * 60_000;

/** Expo has a receipt ready about 15 minutes after the send (Step 54.1). */
export const RECEIPT_WAIT_MS = 15 * 60_000;

/**
 * The one-by-one sends after a refused batch stop this long after the claim;
 * the rest go next pass. With one last send's 30-second timeout, that's
 * 90 seconds, inside the 2-minute claim, so no other worker can take the
 * rows back and send them twice (code review).
 */
const ONE_BY_ONE_BUDGET_MS = 60_000;

/** A message the one-by-one sends ran out of time for: it's sent next pass, not counted as a try. */
const NOT_TRIED = "not_tried";

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
    return { id: delivery.id, outcome: "sent", ticketId: answer.ticket.id, receiptInMs: RECEIPT_WAIT_MS };
  }

  const error = answer.ok ? (answer.ticket.status === "error" ? answer.ticket.error : "unknown") : answer.error;
  if (error === "DeviceNotRegistered") return { id: delivery.id, outcome: "gone", pushTokenId: delivery.pushTokenId };
  if (error === "MessageTooBig" || delivery.ageMs >= GIVE_UP_AFTER_MS) {
    return { id: delivery.id, outcome: "failed", error };
  }
  const rateLimited = error === "MessageRateExceeded" || error === "http_429" || error === NOT_TRIED;
  return {
    id: delivery.id,
    outcome: "retry",
    retryInMs: rateLimited ? FIRST_RETRY_MS : retryDelayMs(delivery.tries),
    countsAsTry: !rateLimited,
    error,
  };
}

export type PushDeps = { outbox: PushOutboxRepository; sender: PushSender };

/**
 * After Expo refuses a whole batch (`http_400`), each message is sent on its
 * own (Step 54.1), so one bad message can't hold back the rest. A message
 * refused alone fails, but only if another got through: if none did, the
 * problem is every push's (a bad deploy, say), so the whole batch retries
 * as before. Stops after a minute; the rest go next pass.
 */
async function sendOneByOne(
  due: DueDelivery[],
  sender: PushSender,
  deadline: number,
  now: () => number,
): Promise<SendAnswer[]> {
  const answers: SendAnswer[] = [];
  for (const delivery of due) {
    if (now() > deadline) {
      answers.push({ ok: false, error: NOT_TRIED });
      continue;
    }
    const sent = await sender.send([toPushMessage(delivery)]);
    answers.push(sent.ok ? { ok: true, ticket: sent.tickets[0] } : sent);
  }
  const anyAccepted = answers.some((answer) => answer.ok && answer.ticket.status === "ok");
  if (!anyAccepted) {
    console.error("push: Expo refused every message (http_400), alone too; the batch will be tried again");
    return due.map(() => ({ ok: false, error: "http_400" }));
  }
  return answers;
}

/** Claims one batch of due deliveries, sends it in one request, and saves every result in one write. */
export async function sendDue(deps: PushDeps, now: () => number = Date.now): Promise<DeliveryResult[]> {
  const claimedAt = now();
  const due = await deps.outbox.claimDue(PUSH_BATCH, CLAIM_MS);
  if (due.length === 0) return [];

  const sent = await deps.sender.send(due.map(toPushMessage));
  let answers: SendAnswer[];
  if (!sent.ok && sent.error === "http_400" && due.length > 1) {
    answers = await sendOneByOne(due, deps.sender, claimedAt + ONE_BY_ONE_BUDGET_MS, now);
  } else {
    answers = due.map((_, index): SendAnswer => (sent.ok ? { ok: true, ticket: sent.tickets[index] } : sent));
  }
  const results = due.map((delivery, index): DeliveryResult => {
    const answer = answers[index];
    // Refused on its own while others got through: this one message is the problem.
    if (!answer.ok && answer.error === "http_400" && due.length > 1 && answers.some((other) => other.ok)) {
      return { id: delivery.id, outcome: "failed", error: "http_400" };
    }
    return resultFor(delivery, answer);
  });
  await deps.outbox.saveResults(results);
  return results;
}
