import type { ReceiptDue, ReceiptResult } from "@/data/repositories/push-outbox-repository";
import type { PushReceipt } from "./push-sender";
import { GIVE_UP_AFTER_MS, RECEIPT_WAIT_MS, type PushDeps } from "./send-due";

/** Expo keeps receipts about a day; after that, no answer will come. */
export const RECEIPT_GIVE_UP_MS = 24 * 60 * 60_000;

/** Expo answers at most 1,000 tickets a request. */
export const RECEIPT_BATCH = 1_000;

/**
 * At most this many batches per quiet check: 5,000 receipts every 5
 * minutes, so a big school's morning is checked well within Expo's 24
 * hours (code review). Usually one batch is all there is.
 */
const RECEIPT_BATCHES_PER_CHECK = 5;

/** Receipt errors that mean every push is broken (the server's Expo or Firebase setup), not one phone. */
const SETUP_ERRORS = new Set(["InvalidCredentials", "MismatchSenderId"]);

/**
 * What one receipt means (Step 54.1). The tap's time is already saved, so
 * the receipt is read for two things only: a phone that's gone, and a push
 * Expo never sent. A delivered push needs nothing, and its row is deleted.
 * - ok: delivered;
 * - none yet: asked again later, and after 24 hours taken as delivered;
 * - `DeviceNotRegistered`: the phone's push address goes;
 * - `MessageRateExceeded`: Expo was too busy and never sent it, so it's sent
 *   again, unless the notification is past the 6 hours;
 * - anything else: failed.
 */
export function receiptOutcome(row: ReceiptDue, receipt: PushReceipt | undefined): ReceiptResult {
  if (!receipt) {
    return row.sentAgeMs >= RECEIPT_GIVE_UP_MS
      ? { id: row.id, outcome: "delivered" }
      : { id: row.id, outcome: "not_ready" };
  }
  if (receipt.status === "ok") return { id: row.id, outcome: "delivered" };
  if (receipt.error === "DeviceNotRegistered") return { id: row.id, outcome: "gone", pushTokenId: row.pushTokenId };
  if (receipt.error === "MessageRateExceeded" && row.notificationAgeMs < GIVE_UP_AFTER_MS) {
    return { id: row.id, outcome: "resend" };
  }
  return { id: row.id, outcome: "failed", error: receipt.error };
}

export type ReceiptSummary = {
  delivered: number;
  notReady: number;
  resent: number;
  failed: number;
  phonesGone: number;
};

/**
 * Reads the receipts that are due, 1,000 per request to Expo, saving what
 * each batch means in one write, until a batch comes back short or after
 * 5 batches. When Expo can't answer, nothing changes: the same receipts are
 * due at the next check.
 */
export async function checkReceipts(deps: PushDeps): Promise<ReceiptSummary> {
  const summary: ReceiptSummary = { delivered: 0, notReady: 0, resent: 0, failed: 0, phonesGone: 0 };
  for (let batch = 0; batch < RECEIPT_BATCHES_PER_CHECK; batch++) {
    const checked = await checkReceiptBatch(deps, summary);
    if (checked < RECEIPT_BATCH) break;
  }
  return summary;
}

/** One batch: how many receipts it checked, 0 when there were none or Expo couldn't answer. */
async function checkReceiptBatch(deps: PushDeps, summary: ReceiptSummary): Promise<number> {
  const due = await deps.outbox.receiptsDue(RECEIPT_BATCH);
  if (due.length === 0) return 0;

  const answer = await deps.sender.getReceipts(due.map((row) => row.ticketId));
  if (!answer.ok) {
    console.warn(`push: receipts unavailable (${answer.error}); trying again at the next check`);
    return 0;
  }

  const results = due.map((row) => receiptOutcome(row, answer.receipts[row.ticketId]));
  await deps.outbox.saveReceipts(results, RECEIPT_WAIT_MS);

  let setupErrors = 0;
  for (const result of results) {
    if (result.outcome === "delivered") summary.delivered += 1;
    else if (result.outcome === "not_ready") summary.notReady += 1;
    else if (result.outcome === "resend") summary.resent += 1;
    else if (result.outcome === "gone") summary.phonesGone += 1;
    else {
      summary.failed += 1;
      if (SETUP_ERRORS.has(result.error)) setupErrors += 1;
    }
  }
  if (setupErrors > 0) {
    console.error(
      `push: ${setupErrors} receipt(s) say the server's push setup is wrong (InvalidCredentials or MismatchSenderId): check EXPO_ACCESS_TOKEN and the app's Firebase setup`,
    );
  }
  return due.length;
}
