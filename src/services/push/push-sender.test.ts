import { describe, expect, it } from "vitest";
import { EXPO_PUSH_URL, expoPushSender, getPushSender, logPushSender, type PushMessage } from "./push-sender";

const MESSAGE: PushMessage = {
  to: "ExponentPushToken[a]",
  title: "Bantay Aral",
  body: "Juan tapped in at 7:56 AM",
  data: { notificationId: "n", childId: "c" },
  sound: "default",
  channelId: "attendance",
  priority: "high",
};

function fakeFetch(answer: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return answer();
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("expoPushSender", () => {
  it("posts the messages to Expo with the access token, and reads a ticket per message", async () => {
    const { calls, fetchImpl } = fakeFetch(() =>
      Response.json({
        data: [
          { status: "ok", id: "ticket-1" },
          { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } },
        ],
      }),
    );
    const result = await expoPushSender("expo-token", fetchImpl).send([MESSAGE, MESSAGE]);

    expect(result).toEqual({
      ok: true,
      tickets: [
        { status: "ok", id: "ticket-1" },
        { status: "error", error: "DeviceNotRegistered" },
      ],
    });
    expect(calls[0].url).toBe(EXPO_PUSH_URL);
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe("Bearer expo-token");
    expect(JSON.parse(String(calls[0].init.body))).toEqual([MESSAGE, MESSAGE]);
  });

  it("sends no Authorization header without a token", async () => {
    const { calls, fetchImpl } = fakeFetch(() => Response.json({ data: [{ status: "ok", id: "t" }] }));
    await expoPushSender(undefined, fetchImpl).send([MESSAGE]);
    expect(new Headers(calls[0].init.headers).has("Authorization")).toBe(false);
  });

  it("names why a whole request failed", async () => {
    const status = (code: number) => fakeFetch(() => new Response("busy", { status: code })).fetchImpl;
    await expect(expoPushSender(undefined, status(503)).send([MESSAGE])).resolves.toEqual({
      ok: false,
      error: "http_503",
    });

    const timeout = fakeFetch(() => Promise.reject(new DOMException("slow", "TimeoutError"))).fetchImpl;
    await expect(expoPushSender(undefined, timeout).send([MESSAGE])).resolves.toEqual({ ok: false, error: "timeout" });

    const offline = fakeFetch(() => Promise.reject(new TypeError("fetch failed"))).fetchImpl;
    await expect(expoPushSender(undefined, offline).send([MESSAGE])).resolves.toEqual({ ok: false, error: "network" });

    // One ticket for two messages can't be matched up, so neither counts as sent.
    const short = fakeFetch(() => Response.json({ data: [{ status: "ok", id: "t" }] })).fetchImpl;
    await expect(expoPushSender(undefined, short).send([MESSAGE, MESSAGE])).resolves.toEqual({
      ok: false,
      error: "bad_answer",
    });
  });
});

describe("logPushSender and getPushSender", () => {
  it("accepts every message without sending it", async () => {
    const result = await logPushSender().send([MESSAGE, MESSAGE]);
    expect(result.ok && result.tickets.every((ticket) => ticket.status === "ok" && ticket.id.startsWith("log-"))).toBe(
      true,
    );
  });

  it("sends for real only when PUSH_SENDER is expo", async () => {
    const answer = await getPushSender({ NODE_ENV: "test", PUSH_SENDER: "log" }).send([MESSAGE]);
    expect(answer.ok && answer.tickets[0].status === "ok" && answer.tickets[0].id).toMatch(/^log-/);
    const unset = await getPushSender({ NODE_ENV: "test" }).send([MESSAGE]);
    expect(unset.ok && unset.tickets[0].status === "ok" && unset.tickets[0].id).toMatch(/^log-/);
  });
});
