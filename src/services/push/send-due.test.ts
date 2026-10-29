import { describe, expect, it } from "vitest";
import { createMockPushOutboxRepository, type DueDelivery } from "@/data/repositories/push-outbox-repository";
import { toPushMessage } from "./push-message";
import type { PushMessage, PushSender } from "./push-sender";
import { GIVE_UP_AFTER_MS, RECEIPT_WAIT_MS, resultFor, retryDelayMs, sendDue } from "./send-due";

function delivery(id: string, overrides: Partial<DueDelivery> = {}): DueDelivery {
  return {
    id,
    pushTokenId: `push-${id}`,
    token: `ExponentPushToken[${id}]`,
    tries: 0,
    notificationId: `notification-${id}`,
    studentId: "student-0001",
    childFirstName: "Juan",
    kind: "time_in",
    tappedAt: "2026-06-19T23:56:00.000Z",
    ageMs: 5_000,
    ...overrides,
  };
}

describe("toPushMessage", () => {
  it("puts the child's first name in the title, then what happened and when, on the school's clock (Step 59.6, P-061)", () => {
    expect(toPushMessage(delivery("a"))).toStrictEqual({
      to: "ExponentPushToken[a]",
      title: "Juan",
      body: "Tapped in at 7:56 AM",
      data: { notificationId: "notification-a", childId: "student-0001" },
      sound: "default",
      channelId: "attendance",
      priority: "high",
    });
    expect(toPushMessage(delivery("b", { kind: "time_out", tappedAt: "2026-06-19T08:05:00.000Z" })).body).toBe(
      "Tapped out at 4:05 PM",
    );
  });

  it("says a new parent account was linked, with no adult's name and no time (Step 55.2)", () => {
    expect(toPushMessage(delivery("c", { kind: "guardian_linked" }))).toMatchObject({
      title: "Juan",
      body: "A new parent account was linked",
      data: { notificationId: "notification-c", childId: "student-0001" },
      channelId: "attendance",
    });
  });
});

describe("resultFor", () => {
  it("marks an accepted push sent, with Expo's ticket and its receipt in 15 minutes", () => {
    expect(resultFor(delivery("a"), { ok: true, ticket: { status: "ok", id: "ticket-1" } })).toEqual({
      id: "a",
      outcome: "sent",
      ticketId: "ticket-1",
      receiptInMs: RECEIPT_WAIT_MS,
    });
    expect(RECEIPT_WAIT_MS).toBe(15 * 60_000);
  });

  it("drops a phone whose app is gone", () => {
    const answer = { ok: true, ticket: { status: "error", error: "DeviceNotRegistered" } } as const;
    expect(resultFor(delivery("a"), answer)).toEqual({ id: "a", outcome: "gone", pushTokenId: "push-a" });
  });

  it("tries again later after a failed send, waiting longer each time", () => {
    expect(resultFor(delivery("a"), { ok: false, error: "timeout" })).toEqual({
      id: "a",
      outcome: "retry",
      retryInMs: 30_000,
      countsAsTry: true,
      error: "timeout",
    });
    expect(resultFor(delivery("a", { tries: 3 }), { ok: false, error: "http_503" })).toMatchObject({
      retryInMs: 240_000,
    });
    expect(retryDelayMs(20)).toBe(30 * 60_000);
  });

  it("doesn't count a rate limit as a try", () => {
    const answer = { ok: true, ticket: { status: "error", error: "MessageRateExceeded" } } as const;
    expect(resultFor(delivery("a", { tries: 4 }), answer)).toMatchObject({
      outcome: "retry",
      retryInMs: 30_000,
      countsAsTry: false,
    });
    expect(resultFor(delivery("a"), { ok: false, error: "http_429" })).toMatchObject({ countsAsTry: false });
  });

  it("gives up after 6 hours, or at once when sending again can't help", () => {
    expect(resultFor(delivery("a", { ageMs: GIVE_UP_AFTER_MS }), { ok: false, error: "network" })).toEqual({
      id: "a",
      outcome: "failed",
      error: "network",
    });
    const tooBig = { ok: true, ticket: { status: "error", error: "MessageTooBig" } } as const;
    expect(resultFor(delivery("a"), tooBig)).toMatchObject({ outcome: "failed" });
  });
});

describe("sendDue", () => {
  it("sends the due deliveries in one request and saves each result", async () => {
    const outbox = createMockPushOutboxRepository([delivery("a"), delivery("b")]);
    const requests: PushMessage[][] = [];
    const sender: PushSender = {
      async send(messages) {
        requests.push(messages);
        return {
          ok: true,
          tickets: [
            { status: "ok", id: "ticket-a" },
            { status: "error", error: "DeviceNotRegistered" },
          ],
        };
      },
      getReceipts: async () => ({ ok: true, receipts: {} }),
    };

    await sendDue({ outbox, sender });

    expect(requests).toHaveLength(1);
    expect(requests[0].map((message) => message.to)).toEqual(["ExponentPushToken[a]", "ExponentPushToken[b]"]);
    expect(outbox.saved).toEqual([
      { id: "a", outcome: "sent", ticketId: "ticket-a", receiptInMs: RECEIPT_WAIT_MS },
      { id: "b", outcome: "gone", pushTokenId: "push-b" },
    ]);
  });

  it("puts the whole batch back to try again when the request fails", async () => {
    const outbox = createMockPushOutboxRepository([delivery("a"), delivery("b")]);
    const sender: PushSender = {
      send: async () => ({ ok: false, error: "network" }),
      getReceipts: async () => ({ ok: true, receipts: {} }),
    };

    await sendDue({ outbox, sender });

    expect(outbox.saved.map((result) => result.outcome)).toEqual(["retry", "retry"]);
  });

  it("after a refused batch, sends each message alone and fails only the one Expo refuses alone", async () => {
    const outbox = createMockPushOutboxRepository([delivery("a"), delivery("bad"), delivery("c")]);
    const requests: string[][] = [];
    const sender: PushSender = {
      async send(messages) {
        requests.push(messages.map((message) => message.to));
        if (messages.length > 1 || messages[0].to.includes("bad")) return { ok: false, error: "http_400" };
        return { ok: true, tickets: [{ status: "ok", id: `ticket-${messages[0].to}` }] };
      },
      getReceipts: async () => ({ ok: true, receipts: {} }),
    };

    await sendDue({ outbox, sender });

    expect(requests).toHaveLength(4);
    expect(outbox.saved.map((result) => [result.id, result.outcome])).toEqual([
      ["a", "sent"],
      ["bad", "failed"],
      ["c", "sent"],
    ]);
  });

  it("keeps retrying the whole batch when every message is refused alone too", async () => {
    const outbox = createMockPushOutboxRepository([delivery("a"), delivery("b")]);
    const sender: PushSender = {
      send: async () => ({ ok: false, error: "http_400" }),
      getReceipts: async () => ({ ok: true, receipts: {} }),
    };

    await sendDue({ outbox, sender });

    expect(outbox.saved.map((result) => result.outcome)).toEqual(["retry", "retry"]);
  });

  it("leaves the messages it had no time for to the next pass, not counted as a try", async () => {
    const outbox = createMockPushOutboxRepository([delivery("a"), delivery("b"), delivery("c")]);
    let clock = 0;
    const sender: PushSender = {
      async send(messages) {
        if (messages.length > 1) return { ok: false, error: "http_400" };
        clock += 61_000;
        return { ok: true, tickets: [{ status: "ok", id: "t" }] };
      },
      getReceipts: async () => ({ ok: true, receipts: {} }),
    };

    await sendDue({ outbox, sender }, () => clock);

    expect(outbox.saved[0]).toMatchObject({ id: "a", outcome: "sent" });
    expect(outbox.saved.slice(1)).toEqual([
      expect.objectContaining({ id: "b", outcome: "retry", countsAsTry: false }),
      expect.objectContaining({ id: "c", outcome: "retry", countsAsTry: false }),
    ]);
  });

  it("sends nothing when nothing is due", async () => {
    let calls = 0;
    const sender: PushSender = {
      async send() {
        calls += 1;
        return { ok: true, tickets: [] };
      },
      getReceipts: async () => ({ ok: true, receipts: {} }),
    };
    await expect(sendDue({ outbox: createMockPushOutboxRepository(), sender })).resolves.toEqual([]);
    expect(calls).toBe(0);
  });
});
