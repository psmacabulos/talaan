import { describe, expect, it } from "vitest";
import { createMockPushOutboxRepository, type DueDelivery } from "@/data/repositories/push-outbox-repository";
import type { PushSender } from "./push-sender";
import { createPushWorker, runPushPass } from "./push-worker";
import { PUSH_BATCH } from "./send-due";

function due(n: number): DueDelivery[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `d-${index}`,
    pushTokenId: `p-${index}`,
    token: `ExponentPushToken[${index}]`,
    tries: 0,
    notificationId: `n-${index}`,
    studentId: "student-0001",
    childFirstName: "Juan",
    kind: "time_in" as const,
    tappedAt: "2026-06-19T23:56:00.000Z",
    ageMs: 1_000,
  }));
}

const accepting: PushSender = {
  send: async (messages) => ({ ok: true, tickets: messages.map((_, index) => ({ status: "ok", id: `t-${index}` })) }),
};

describe("runPushPass", () => {
  it("fans out, then sends batch after batch until one comes back short", async () => {
    const outbox = createMockPushOutboxRepository(due(PUSH_BATCH + 3));
    const summary = await runPushPass({ outbox, sender: accepting });

    expect(outbox.fanOuts).toBe(1);
    expect(outbox.due).toEqual([]);
    expect(summary).toEqual({ sent: PUSH_BATCH + 3, retrying: 0, failed: 0, phonesGone: 0, tooOld: 0 });
  });
});

describe("createPushWorker", () => {
  it("runs one pass at a time, and once more for a wake that came during a pass", async () => {
    const outbox = createMockPushOutboxRepository();
    let release: () => void = () => {};
    const firstFanOut = new Promise<void>((resolve) => (release = resolve));
    const fanOut = outbox.fanOut;
    outbox.fanOut = async (...args) => {
      if (outbox.fanOuts === 0) await firstFanOut;
      return fanOut(...args);
    };
    const worker = createPushWorker({ outbox, sender: accepting });

    const first = worker.wake();
    await worker.wake();
    await worker.wake();
    release();
    await first;

    // Two passes: the first, and one more for both wakes that came during it.
    expect(outbox.fanOuts).toBe(2);
  });

  it("logs a failed pass and is ready for the next wake", async () => {
    const outbox = createMockPushOutboxRepository();
    outbox.fanOut = async () => {
      throw new Error("database down");
    };
    const worker = createPushWorker({ outbox, sender: accepting });
    await expect(worker.wake()).resolves.toBeUndefined();
    await expect(worker.wake()).resolves.toBeUndefined();
  });
});
