import { describe, expect, it, vi } from "vitest";
import { GateOfflineError, GateServerError, GateUnauthorizedError } from "./gate-client";
import type { GateTapResponse } from "./responses";
import { EMPTY_QUEUE, MAX_SERVER_ERRORS, type QueuedTap, type TapQueue } from "./tap-queue";
import { createTapSender, type TapSenderDeps } from "./tap-sender";

const SCHOOL = "school-a";
const answer: GateTapResponse = { outcome: "invalid_serial" };

const tap = (id: string, schoolId = SCHOOL): QueuedTap => ({
  id,
  raw: "0211299923",
  scannedAt: "2026-06-19T23:05:00.000Z",
  schoolId,
  tries: 0,
});

/** Lets every pending promise callback run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A sender whose `send` the test answers by hand: each call waits in
 * `calls` until the test resolves or rejects it. `saved` is what storage
 * holds, as the tablet would after a reload.
 */
function setup(initial: TapQueue = EMPTY_QUEUE) {
  let saved = initial;
  const calls: {
    tap: QueuedTap;
    savedAtSend: TapQueue;
    resolve: (r: GateTapResponse) => void;
    reject: (e: Error) => void;
  }[] = [];
  const deps: TapSenderDeps = {
    schoolId: SCHOOL,
    load: () => saved,
    save: (queue) => {
      saved = queue;
      return "saved";
    },
    send: (sent) =>
      new Promise((resolve, reject) => {
        calls.push({ tap: sent, savedAtSend: saved, resolve, reject });
      }),
    onAnswer: vi.fn(),
    onUnsent: vi.fn(),
    onUnauthorized: vi.fn(),
    onChange: vi.fn(),
  };
  const sender = createTapSender(deps);
  return { sender, deps, calls, saved: () => saved };
}

describe("createTapSender", () => {
  it("saves a tap before sending it, and removes it once answered", async () => {
    const { sender, deps, calls, saved } = setup();
    expect(sender.add(tap("a"))).toBe("sending");
    expect(calls[0].savedAtSend.waiting.map((item) => item.id)).toEqual(["a"]);

    calls[0].resolve(answer);
    await settle();
    expect(saved()).toEqual(EMPTY_QUEUE);
    expect(deps.onAnswer).toHaveBeenCalledWith("a", answer);
  });

  it("never counts a tap on its way as waiting, so a normal tap doesn't flash the strip", async () => {
    const { sender, deps, calls } = setup();
    sender.add(tap("a"));
    expect(sender.summary().waiting).toBe(0);
    expect(deps.onChange).not.toHaveBeenCalledWith(expect.objectContaining({ waiting: 1 }));
    calls[0].reject(new GateOfflineError());
    await settle();
    // Not sent: now it's waiting.
    expect(sender.summary().waiting).toBe(1);
  });

  it("sends a new tap at once while the only other one is already on its way", () => {
    const { sender, calls } = setup();
    sender.add(tap("a"));
    expect(sender.add(tap("b"))).toBe("sending");
    expect(calls.map((call) => call.tap.id)).toEqual(["a", "b"]);
  });

  it("keeps a tap saved when there's no connection, and sends the line oldest first, one at a time, later", async () => {
    const { sender, deps, calls, saved } = setup();
    sender.add(tap("a"));
    calls[0].reject(new GateOfflineError());
    await settle();
    expect(deps.onUnsent).toHaveBeenCalledWith("a");

    // Something is waiting, so new taps join the end of the line.
    expect(sender.add(tap("b"))).toBe("waiting");
    await settle();
    // The line tried "a" again (still offline in this test) and stopped there.
    expect(calls.map((call) => call.tap.id)).toEqual(["a", "a"]);
    calls[1].reject(new GateOfflineError());
    await settle();
    expect(saved().waiting.map((item) => item.id)).toEqual(["a", "b"]);

    // Back online: one at a time, each after the one before has its answer.
    sender.kick();
    await settle();
    expect(calls.map((call) => call.tap.id)).toEqual(["a", "a", "a"]);
    calls[2].resolve(answer);
    await settle();
    expect(calls.map((call) => call.tap.id)).toEqual(["a", "a", "a", "b"]);
    calls[3].resolve(answer);
    await settle();
    expect(saved()).toEqual(EMPTY_QUEUE);
  });

  it("starts with the line saved before a reload", async () => {
    const { sender, calls } = setup({ waiting: [tap("a"), tap("b")], stuck: [] });
    expect(sender.summary()).toMatchObject({ waiting: 2, stuck: 0 });
    sender.kick();
    sender.kick(); // Calling it twice still sends one at a time.
    await settle();
    expect(calls.map((call) => call.tap.id)).toEqual(["a"]);
  });

  it("never marks a tap stuck however long the internet is down", async () => {
    const { sender, calls, saved } = setup({ waiting: [tap("a")], stuck: [] });
    for (let i = 0; i < MAX_SERVER_ERRORS * 2; i++) {
      sender.kick();
      await settle();
      calls[i].reject(new GateOfflineError());
      await settle();
    }
    expect(saved()).toEqual({ waiting: [tap("a")], stuck: [] });
  });

  it(`moves a tap the server keeps refusing aside after ${MAX_SERVER_ERRORS} errors, so the next one goes`, async () => {
    const { sender, calls, saved } = setup({ waiting: [tap("a"), tap("b")], stuck: [] });
    for (let i = 0; i < MAX_SERVER_ERRORS; i++) {
      sender.kick();
      await settle();
      calls[i].reject(new GateServerError("503"));
      await settle();
    }
    expect(saved().stuck.map((item) => [item.id, item.tries])).toEqual([["a", MAX_SERVER_ERRORS]]);
    sender.kick();
    await settle();
    expect(calls.at(-1)?.tap.id).toBe("b");
  });

  it("tries stuck taps again when asked, and they leave once answered", async () => {
    const { sender, calls, saved } = setup({ waiting: [], stuck: [{ ...tap("a"), tries: MAX_SERVER_ERRORS }] });
    const retry = sender.retryStuck();
    await settle();
    calls[0].resolve(answer);
    await retry;
    expect(saved()).toEqual(EMPTY_QUEUE);
  });

  it("never deletes a tap on an error answer: one the server keeps refusing ends up stuck (Step 58's code review)", async () => {
    const { sender, deps, calls, saved } = setup();
    sender.add(tap("a"));
    // A school's web filter answering 404 looks like this too.
    calls[0].reject(new GateServerError("404"));
    await settle();
    expect(saved().waiting.map((item) => [item.id, item.tries])).toEqual([["a", 1]]);
    expect(deps.onAnswer).not.toHaveBeenCalled();
    expect(deps.onUnsent).toHaveBeenCalledWith("a");
  });

  it("a new tap waits its turn while the line is being sent, even behind the line's last tap", async () => {
    const { sender, calls } = setup({ waiting: [tap("a")], stuck: [] });
    sender.kick();
    await settle();
    expect(sender.add(tap("b"))).toBe("waiting");
    expect(calls.map((call) => call.tap.id)).toEqual(["a"]);
    calls[0].resolve(answer);
    await settle();
    expect(calls.map((call) => call.tap.id)).toEqual(["a", "b"]);
  });

  it("an old sender's late answer never saves its own copy over a new sender's line", async () => {
    let stored: TapQueue = EMPTY_QUEUE;
    const pending: ((response: GateTapResponse) => void)[] = [];
    const deps = (): TapSenderDeps => ({
      schoolId: SCHOOL,
      load: () => stored,
      save: (queue) => {
        stored = queue;
        return "saved";
      },
      send: () => new Promise((resolve) => pending.push(resolve)),
      onAnswer: vi.fn(),
      onUnsent: vi.fn(),
      onUnauthorized: vi.fn(),
      onChange: vi.fn(),
    });
    const old = createTapSender(deps());
    old.add(tap("a"));
    // Disconnect, then connect again while "a" is still on its way.
    old.stop();
    const fresh = createTapSender(deps());
    fresh.add(tap("b"));
    pending[0](answer);
    await settle();
    // "a" was answered, so it leaves; "b", saved by the new sender, stays.
    expect(stored.waiting.map((item) => item.id)).toEqual(["b"]);
  });

  it("stops on a refused token and keeps the line", async () => {
    const { sender, deps, calls, saved } = setup({ waiting: [tap("a"), tap("b")], stuck: [] });
    sender.kick();
    await settle();
    calls[0].reject(new GateUnauthorizedError());
    await settle();
    expect(deps.onUnauthorized).toHaveBeenCalled();
    expect(saved().waiting).toHaveLength(2);
    sender.kick();
    await settle();
    expect(calls).toHaveLength(1);
  });

  it("leaves another school's taps alone, and keeps them when saving", async () => {
    const { sender, calls, saved } = setup({ waiting: [tap("x", "school-b"), tap("a")], stuck: [] });
    expect(sender.summary()).toMatchObject({ waiting: 1, otherSchool: 1 });
    sender.kick();
    await settle();
    expect(calls.map((call) => call.tap.id)).toEqual(["a"]);
    calls[0].resolve(answer);
    await settle();
    expect(saved().waiting).toEqual([tap("x", "school-b")]);
  });
});
