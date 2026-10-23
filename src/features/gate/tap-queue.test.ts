import { describe, expect, it } from "vitest";
import {
  addTap,
  EMPTY_QUEUE,
  forSchool,
  MAX_SERVER_ERRORS,
  readQueue,
  recordServerError,
  removeTap,
  writeQueue,
  type QueuedTap,
} from "./tap-queue";

/** A Storage stand-in; `full` makes every write throw, as a full browser storage does. */
function memoryStorage({ full = false } = {}): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => {
      if (full) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      items.set(key, value);
    },
  };
}

const tap = (id: string, schoolId = "school-a"): QueuedTap => ({
  id,
  raw: "0211299923",
  scannedAt: "2026-06-19T23:05:00.000Z",
  schoolId,
  tries: 0,
});

describe("the gate's waiting line", () => {
  it("keeps taps in the order they were read, across a reload", () => {
    const storage = memoryStorage();
    const queue = addTap(addTap(addTap(EMPTY_QUEUE, tap("a")), tap("b")), tap("c"));
    expect(writeQueue(storage, queue)).toBe("saved");
    // A reload reads the same storage afresh.
    expect(readQueue(storage).waiting.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("reads nothing, never a crash, when the saved line is missing or corrupt", () => {
    const storage = memoryStorage();
    expect(readQueue(storage)).toEqual(EMPTY_QUEUE);
    storage.setItem("talaan.gate.queue", "{not json");
    expect(readQueue(storage)).toEqual(EMPTY_QUEUE);
    storage.setItem("talaan.gate.queue", JSON.stringify({ waiting: [tap("a"), { id: 1 }], stuck: "no" }));
    expect(readQueue(storage)).toEqual({ waiting: [tap("a")], stuck: [] });
    expect(readQueue(null)).toEqual(EMPTY_QUEUE);
  });

  it("says the storage is full instead of throwing", () => {
    expect(writeQueue(memoryStorage({ full: true }), addTap(EMPTY_QUEUE, tap("a")))).toBe("full");
    expect(writeQueue(null, EMPTY_QUEUE)).toBe("full");
  });

  it("removes an answered tap from either list", () => {
    const queue = { waiting: [tap("a"), tap("b")], stuck: [tap("c")] };
    expect(removeTap(queue, "b")).toEqual({ waiting: [tap("a")], stuck: [tap("c")] });
    expect(removeTap(queue, "c")).toEqual({ waiting: [tap("a"), tap("b")], stuck: [] });
  });

  it(`moves a tap to stuck after ${MAX_SERVER_ERRORS} error answers, keeping the rest in order`, () => {
    let queue = addTap(addTap(EMPTY_QUEUE, tap("a")), tap("b"));
    for (let i = 1; i < MAX_SERVER_ERRORS; i++) queue = recordServerError(queue, "a");
    expect(queue.waiting.map((item) => [item.id, item.tries])).toEqual([
      ["a", MAX_SERVER_ERRORS - 1],
      ["b", 0],
    ]);
    queue = recordServerError(queue, "a");
    expect(queue.waiting.map((item) => item.id)).toEqual(["b"]);
    expect(queue.stuck).toEqual([{ ...tap("a"), tries: MAX_SERVER_ERRORS }]);
  });

  it("keeps only one school's taps for that school's token", () => {
    const queue = { waiting: [tap("a", "school-a"), tap("b", "school-b")], stuck: [tap("c", "school-b")] };
    expect(forSchool(queue, "school-b")).toEqual({ waiting: [tap("b", "school-b")], stuck: [tap("c", "school-b")] });
  });
});
