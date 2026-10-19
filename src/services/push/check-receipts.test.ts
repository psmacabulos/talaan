import { describe, expect, it, vi } from "vitest";
import { createMockPushOutboxRepository, type ReceiptDue } from "@/data/repositories/push-outbox-repository";
import { checkReceipts, RECEIPT_GIVE_UP_MS, receiptOutcome } from "./check-receipts";
import type { PushSender } from "./push-sender";
import { GIVE_UP_AFTER_MS, RECEIPT_WAIT_MS } from "./send-due";

const MINUTE = 60_000;

function row(id: string, overrides: Partial<ReceiptDue> = {}): ReceiptDue {
  return {
    id,
    ticketId: `ticket-${id}`,
    pushTokenId: `push-${id}`,
    sentAgeMs: 16 * MINUTE,
    notificationAgeMs: 16 * MINUTE,
    ...overrides,
  };
}

describe("receiptOutcome", () => {
  it("deletes a delivered push: nothing about a success is kept", () => {
    expect(receiptOutcome(row("a"), { status: "ok" })).toEqual({ id: "a", outcome: "delivered" });
  });

  it("asks again later when the receipt isn't ready, and gives up after 24 hours as delivered", () => {
    expect(receiptOutcome(row("a"), undefined)).toEqual({ id: "a", outcome: "not_ready" });
    expect(receiptOutcome(row("a", { sentAgeMs: RECEIPT_GIVE_UP_MS }), undefined)).toEqual({
      id: "a",
      outcome: "delivered",
    });
  });

  it("drops a phone whose app is gone", () => {
    expect(receiptOutcome(row("a"), { status: "error", error: "DeviceNotRegistered" })).toEqual({
      id: "a",
      outcome: "gone",
      pushTokenId: "push-a",
    });
  });

  it("sends again a push Expo was too busy to send, within the 6 hours", () => {
    const busy = { status: "error", error: "MessageRateExceeded" } as const;
    expect(receiptOutcome(row("a"), busy)).toEqual({ id: "a", outcome: "resend" });
    expect(receiptOutcome(row("a", { notificationAgeMs: GIVE_UP_AFTER_MS }), busy)).toEqual({
      id: "a",
      outcome: "failed",
      error: "MessageRateExceeded",
    });
  });

  it("fails on any other error", () => {
    expect(receiptOutcome(row("a"), { status: "error", error: "MessageTooBig" })).toEqual({
      id: "a",
      outcome: "failed",
      error: "MessageTooBig",
    });
  });
});

describe("checkReceipts", () => {
  it("asks Expo for every due receipt in one request and saves what each means", async () => {
    const outbox = createMockPushOutboxRepository([], [row("a"), row("b"), row("c")]);
    const asked: string[][] = [];
    const sender: PushSender = {
      send: async () => ({ ok: true, tickets: [] }),
      async getReceipts(ids) {
        asked.push(ids);
        return {
          ok: true,
          receipts: { "ticket-a": { status: "ok" }, "ticket-b": { status: "error", error: "DeviceNotRegistered" } },
        };
      },
    };

    const summary = await checkReceipts({ outbox, sender });

    expect(asked).toEqual([["ticket-a", "ticket-b", "ticket-c"]]);
    expect(outbox.savedReceipts).toEqual([
      { id: "a", outcome: "delivered" },
      { id: "b", outcome: "gone", pushTokenId: "push-b" },
      { id: "c", outcome: "not_ready" },
    ]);
    expect(summary).toEqual({ delivered: 1, notReady: 1, resent: 0, failed: 0, phonesGone: 1 });
    expect(RECEIPT_WAIT_MS).toBe(15 * MINUTE);
  });

  it("reads a backlog 1,000 at a time, at most 5 batches per check", async () => {
    const backlog = Array.from({ length: 6_500 }, (_, index) => row(`r${index}`));
    const outbox = createMockPushOutboxRepository([], backlog);
    let requests = 0;
    const sender: PushSender = {
      send: async () => ({ ok: true, tickets: [] }),
      async getReceipts(ids) {
        requests += 1;
        return { ok: true, receipts: Object.fromEntries(ids.map((id) => [id, { status: "ok" as const }])) };
      },
    };

    const summary = await checkReceipts({ outbox, sender });

    expect(requests).toBe(5);
    expect(summary.delivered).toBe(5_000);
    expect(outbox.receipts).toHaveLength(1_500);
  });

  it("changes nothing when Expo can't answer, so the same receipts are due next time", async () => {
    const outbox = createMockPushOutboxRepository([], [row("a")]);
    const sender: PushSender = {
      send: async () => ({ ok: true, tickets: [] }),
      getReceipts: async () => ({ ok: false, error: "timeout" }),
    };
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await checkReceipts({ outbox, sender });

    expect(outbox.savedReceipts).toEqual([]);
  });

  it("logs setup errors loudly, since they break every push", async () => {
    const outbox = createMockPushOutboxRepository([], [row("a")]);
    const sender: PushSender = {
      send: async () => ({ ok: true, tickets: [] }),
      getReceipts: async () => ({
        ok: true,
        receipts: { "ticket-a": { status: "error", error: "InvalidCredentials" } },
      }),
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await checkReceipts({ outbox, sender });

    expect(errors).toHaveBeenCalledWith(expect.stringMatching(/push setup is wrong/));
    errors.mockRestore();
  });
});
