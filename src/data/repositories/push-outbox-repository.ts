import type { NotificationKind } from "@/features/parents/types";

/** What one fan-out did (Step 54): notifications claimed, how many were too old to push, deliveries made. */
export type FanOutResult = { notifications: number; tooOld: number; deliveries: number };

/** A delivery claimed for sending, with what its message needs. Never more of the child than the first name. */
export type DueDelivery = {
  id: string;
  pushTokenId: string;
  token: string;
  tries: number;
  notificationId: string;
  studentId: string;
  childFirstName: string;
  kind: NotificationKind;
  tappedAt: string;
  /** How long ago the notification was written, by the database's clock. */
  ageMs: number;
};

/** What happened to one claimed delivery. */
export type DeliveryResult =
  /** Expo accepted it: its receipt is asked for `receiptInMs` from now (Step 54.1). */
  | { id: string; outcome: "sent"; ticketId: string; receiptInMs: number }
  | { id: string; outcome: "retry"; retryInMs: number; countsAsTry: boolean; error: string }
  | { id: string; outcome: "failed"; error: string }
  /** The phone is gone (Expo's `DeviceNotRegistered`): its push address is deleted, and its deliveries with it. */
  | { id: string; outcome: "gone"; pushTokenId: string };

/** A sent push whose receipt is due (Step 54.1). Ages are by the database's clock. */
export type ReceiptDue = {
  id: string;
  ticketId: string;
  pushTokenId: string;
  /** How long ago the push was sent. */
  sentAgeMs: number;
  /** How long ago its notification was written. */
  notificationAgeMs: number;
};

/** What one receipt means for its delivery (Step 54.1). */
export type ReceiptResult =
  /** Delivered, or no answer for 24 hours: the row is deleted. Nothing about a success is kept. */
  | { id: string; outcome: "delivered" }
  /** Not ready yet: asked again later. */
  | { id: string; outcome: "not_ready" }
  /** Expo was too busy and never sent it: back to waiting, to be sent again. */
  | { id: string; outcome: "resend" }
  | { id: string; outcome: "failed"; error: string }
  | { id: string; outcome: "gone"; pushTokenId: string };

/** What one cleanup deleted (Step 54.1). */
export type CleanUpResult = { failedDeliveries: number; signIns: number };

/**
 * The push outbox (Step 54): notifications still to push, and one delivery
 * per phone. Every time here is the database's, never the app's clock,
 * which the browser tests pin to a June morning.
 */
export interface PushOutboxRepository {
  /**
   * In one transaction: claims up to `limit` notifications still to push,
   * oldest first, skipping any another worker holds; marks them pushed; and
   * makes one waiting delivery for each push address of each linked parent
   * whose sign-in isn't revoked and was used within `signInUnusedMs`. A
   * notification older than `maxAgeMs` is marked pushed with no deliveries.
   */
  fanOut(limit: number, rules: { maxAgeMs: number; signInUnusedMs: number }): Promise<FanOutResult>;
  /**
   * Claims up to `limit` deliveries that are due: waiting and past
   * `nextAttemptAt`, or still "sending" past `claimedUntil` (a worker died
   * mid-send). They're "sending" for `claimMs`, skipping any another worker holds.
   */
  claimDue(limit: number, claimMs: number): Promise<DueDelivery[]>;
  /** Writes every result of one send back, in one transaction. Only rows still "sending" change. */
  saveResults(results: DeliveryResult[]): Promise<void>;
  /**
   * Up to `limit` sent pushes whose receipt is due, oldest due first. A
   * plain read: every write in `saveReceipts` is safe to repeat, so two
   * workers reading the same row do no harm.
   */
  receiptsDue(limit: number): Promise<ReceiptDue[]>;
  /** Writes every receipt's outcome, in one transaction. "not_ready" is asked again in `askAgainInMs`. */
  saveReceipts(results: ReceiptResult[], askAgainInMs: number): Promise<void>;
  /**
   * Deletes failed deliveries older than `failedKeepMs`, and sign-ins that
   * are revoked or unused for `signInUnusedMs` (their push addresses and
   * deliveries go by the cascade), in batches of `batch`, at most `maxBatches` each.
   */
  cleanUp(rules: {
    failedKeepMs: number;
    signInUnusedMs: number;
    batch: number;
    maxBatches: number;
  }): Promise<CleanUpResult>;
}

/** In memory, for the worker's tests: claims and saves what it's given. */
export function createMockPushOutboxRepository(
  due: DueDelivery[] = [],
  receipts: ReceiptDue[] = [],
): PushOutboxRepository & {
  due: DueDelivery[];
  receipts: ReceiptDue[];
  saved: DeliveryResult[];
  savedReceipts: ReceiptResult[];
  fanOuts: number;
  cleanUps: number;
} {
  const state = {
    due,
    receipts,
    saved: [] as DeliveryResult[],
    savedReceipts: [] as ReceiptResult[],
    fanOuts: 0,
    cleanUps: 0,
    async fanOut() {
      state.fanOuts += 1;
      return { notifications: 0, tooOld: 0, deliveries: 0 };
    },
    async claimDue(limit: number) {
      return state.due.splice(0, limit);
    },
    async saveResults(results: DeliveryResult[]) {
      state.saved.push(...results);
    },
    async receiptsDue(limit: number) {
      return state.receipts.splice(0, limit);
    },
    async saveReceipts(results: ReceiptResult[]) {
      state.savedReceipts.push(...results);
    },
    async cleanUp() {
      state.cleanUps += 1;
      return { failedDeliveries: 0, signIns: 0 };
    },
  };
  return state;
}
