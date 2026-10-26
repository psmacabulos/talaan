import { beforeEach, describe, expect, it, vi } from "vitest";

type AfterSend = (event: { event_id?: string }, response?: { statusCode?: number }) => void;

const sentry = vi.hoisted(() => {
  const listeners: AfterSend[] = [];
  const client = {
    on: vi.fn((_hook: string, listener: AfterSend) => {
      listeners.push(listener);
      return () => listeners.splice(listeners.indexOf(listener), 1);
    }),
  };
  return {
    listeners,
    client,
    captureFeedback: vi.fn(() => "event-1"),
    getClient: vi.fn((): typeof client | undefined => client),
  };
});
vi.mock("@sentry/nextjs", () => ({ captureFeedback: sentry.captureFeedback, getClient: sentry.getClient }));

const { sendProblemReport } = await import("./error-reporting");

/** Sentry's transport answering for an event, as `afterSendEvent` would tell it. */
function answer(eventId: string, statusCode?: number) {
  for (const listener of [...sentry.listeners]) listener({ event_id: eventId }, { statusCode });
}

describe("sendProblemReport (Step 59.1)", () => {
  beforeEach(() => {
    sentry.captureFeedback.mockClear();
    sentry.getClient.mockReturnValue(sentry.client);
    sentry.listeners.length = 0;
  });

  it("sends the note, the page without its query, and the reference as the digest tag", async () => {
    const sent = sendProblemReport(
      { note: "  Opening the students list  ", reference: "3f9a1c2b" },
      "https://bantayaral.com/students?q=Juan#top",
    );
    answer("event-1", 200);

    await expect(sent).resolves.toBe("event-1");
    expect(sentry.captureFeedback).toHaveBeenCalledWith({
      message: "Opening the students list",
      url: "https://bantayaral.com/students",
      source: "error-page",
      tags: { digest: "3f9a1c2b" },
    });
  });

  it("never sends a name or an email", async () => {
    const sent = sendProblemReport({ note: "x", reference: "3f9a1c2b" }, "https://bantayaral.com/");
    answer("event-1", 200);
    await sent;
    const [params] = sentry.captureFeedback.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(params).not.toHaveProperty("name");
    expect(params).not.toHaveProperty("email");
  });

  it("says so when the note is empty, since Sentry refuses an empty message", async () => {
    const sent = sendProblemReport({ note: "   " }, "https://bantayaral.com/gate");
    answer("event-1", 200);
    await sent;
    expect(sentry.captureFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "No note added.", tags: undefined }),
    );
  });

  it("waits for its own event's answer, not another's", async () => {
    let settled = false;
    const sent = sendProblemReport({ note: "x" }, "https://bantayaral.com/").then(() => (settled = true));
    answer("some-other-event", 200);
    await Promise.resolve();
    expect(settled).toBe(false);
    answer("event-1", 200);
    await sent;
    expect(settled).toBe(true);
  });

  it("rejects when Sentry refused it", async () => {
    const sent = sendProblemReport({ note: "x" }, "https://bantayaral.com/");
    answer("event-1", 429);
    await expect(sent).rejects.toThrow("Sentry refused the report (429)");
  });

  it("rejects when Sentry never answered", async () => {
    vi.useFakeTimers();
    const sent = sendProblemReport({ note: "x" }, "https://bantayaral.com/");
    const check = expect(sent).rejects.toThrow("Sentry didn't answer");
    await vi.advanceTimersByTimeAsync(15_000);
    await check;
    vi.useRealTimers();
  });

  it("rejects at once when reports aren't on", async () => {
    sentry.getClient.mockReturnValue(undefined);
    await expect(sendProblemReport({ note: "x" }, "https://bantayaral.com/")).rejects.toThrow("aren't on");
    expect(sentry.captureFeedback).not.toHaveBeenCalled();
  });
});
