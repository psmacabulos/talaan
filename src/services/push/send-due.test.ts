import { describe, expect, it } from "vitest";
import { createMockPushOutboxRepository, type DueDelivery } from "@/data/repositories/push-outbox-repository";
import { toPushMessage } from "./push-message";
import type { PushMessage, PushSender } from "./push-sender";
import { GIVE_UP_AFTER_MS, resultFor, retryDelayMs, sendDue } from "./send-due";

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
  it("says the child's first name, what happened and when, on the school's clock", () => {
    expect(toPushMessage(delivery("a"))).toEqual({
      to: "ExponentPushToken[a]",
      title: "Bantay Aral",
      body: "Juan tapped in at 7:56 AM",
      data: { notificationId: "notification-a", childId: "student-0001" },
      sound: "default",
      channelId: "attendance",
      priority: "high",
    });
    expect(toPushMessage(delivery("b", { kind: "time_out", tappedAt: "2026-06-19T08:05:00.000Z" })).body).toBe(
      "Juan tapped out at 4:05 PM",
    );
  });
});

describe("resultFor", () => {
  it("marks an accepted push sent, with Expo's ticket", () => {
    expect(resultFor(delivery("a"), { ok: true, ticket: { status: "ok", id: "ticket-1" } })).toEqual({
      id: "a",
      outcome: "sent",
      ticketId: "ticket-1",
    });
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
    };

    await sendDue({ outbox, sender });

    expect(requests).toHaveLength(1);
    expect(requests[0].map((message) => message.to)).toEqual(["ExponentPushToken[a]", "ExponentPushToken[b]"]);
    expect(outbox.saved).toEqual([
      { id: "a", outcome: "sent", ticketId: "ticket-a" },
      { id: "b", outcome: "gone", pushTokenId: "push-b" },
    ]);
  });

  it("puts the whole batch back to try again when the request fails", async () => {
    const outbox = createMockPushOutboxRepository([delivery("a"), delivery("b")]);
    const sender: PushSender = { send: async () => ({ ok: false, error: "network" }) };

    await sendDue({ outbox, sender });

    expect(outbox.saved.map((result) => result.outcome)).toEqual(["retry", "retry"]);
  });

  it("sends nothing when nothing is due", async () => {
    let calls = 0;
    const sender: PushSender = {
      async send() {
        calls += 1;
        return { ok: true, tickets: [] };
      },
    };
    await expect(sendDue({ outbox: createMockPushOutboxRepository(), sender })).resolves.toEqual([]);
    expect(calls).toBe(0);
  });
});
