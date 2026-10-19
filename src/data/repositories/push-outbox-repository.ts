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
  | { id: string; outcome: "sent"; ticketId: string }
  | { id: string; outcome: "retry"; retryInMs: number; countsAsTry: boolean; error: string }
  | { id: string; outcome: "failed"; error: string }
  /** The phone is gone (Expo's `DeviceNotRegistered`): its push address is deleted, and its deliveries with it. */
  | { id: string; outcome: "gone"; pushTokenId: string };

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
   * whose sign-in isn't revoked. A notification older than `maxAgeMs` is
   * marked pushed with no deliveries.
   */
  fanOut(limit: number, maxAgeMs: number): Promise<FanOutResult>;
  /**
   * Claims up to `limit` deliveries that are due: waiting and past
   * `nextAttemptAt`, or still "sending" past `claimedUntil` (a worker died
   * mid-send). They're "sending" for `claimMs`, skipping any another worker holds.
   */
  claimDue(limit: number, claimMs: number): Promise<DueDelivery[]>;
  /** Writes every result of one send back, in one transaction. Only rows still "sending" change. */
  saveResults(results: DeliveryResult[]): Promise<void>;
}

/** In memory, for the worker's tests: claims and saves what it's given. */
export function createMockPushOutboxRepository(due: DueDelivery[] = []): PushOutboxRepository & {
  due: DueDelivery[];
  saved: DeliveryResult[];
  fanOuts: number;
} {
  const state = {
    due,
    saved: [] as DeliveryResult[],
    fanOuts: 0,
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
  };
  return state;
}
