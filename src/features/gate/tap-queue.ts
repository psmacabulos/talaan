/**
 * The gate's waiting line (Step 58, docs/backend/step-58-offline-gate.md):
 * every tap is written here first, then sent, and removed once the server
 * answers. Kept in the tablet's localStorage, so a tap read while the
 * internet is down, or while the tablet loses power mid-send, is still
 * there to send later. Never emptied by Disconnect or a revoked token:
 * these are taps the server hasn't got yet.
 */
const QUEUE_KEY = "talaan.gate.queue";

/** Error answers from the server (5xx, 429) a tap may get before it stops holding up the line. */
export const MAX_SERVER_ERRORS = 5;

export type QueuedTap = {
  /** The tap's own id, made when the card was read: a resend is recognised by it. */
  id: string;
  /** Exactly what the reader typed. */
  raw: string;
  /** The tablet's clock at the read. */
  scannedAt: string;
  /** The school it was read for: only that school's token ever sends it. */
  schoolId: string;
  /** Error answers from the server so far. No connection doesn't count, or a long outage would make every tap stuck. */
  tries: number;
};

/** `waiting` is sent in order; `stuck` holds taps the server kept refusing, tried again now and then. */
export type TapQueue = { waiting: QueuedTap[]; stuck: QueuedTap[] };

export const EMPTY_QUEUE: TapQueue = { waiting: [], stuck: [] };

function isQueuedTap(value: unknown): value is QueuedTap {
  if (typeof value !== "object" || value === null) return false;
  const tap = value as Record<string, unknown>;
  return (
    typeof tap.id === "string" &&
    typeof tap.raw === "string" &&
    typeof tap.scannedAt === "string" &&
    typeof tap.schoolId === "string" &&
    typeof tap.tries === "number"
  );
}

/** The saved line; empty when there's none, or when what's there can't be read. */
export function readQueue(storage: Storage | null): TapQueue {
  try {
    const raw = storage?.getItem(QUEUE_KEY);
    if (!raw) return EMPTY_QUEUE;
    const parsed = JSON.parse(raw) as { waiting?: unknown; stuck?: unknown };
    const list = (value: unknown) => (Array.isArray(value) ? value.filter(isQueuedTap) : []);
    return { waiting: list(parsed.waiting), stuck: list(parsed.stuck) };
  } catch {
    return EMPTY_QUEUE;
  }
}

/** Saves the line. "full" when the browser's storage is full or blocked: the caller says so on screen, never throws. */
export function writeQueue(storage: Storage | null, queue: TapQueue): "saved" | "full" {
  if (!storage) return "full";
  try {
    if (queue.waiting.length === 0 && queue.stuck.length === 0) storage.removeItem(QUEUE_KEY);
    else storage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return "saved";
  } catch {
    return "full";
  }
}

/** A new tap, at the end of the line. */
export function addTap(queue: TapQueue, tap: QueuedTap): TapQueue {
  return { ...queue, waiting: [...queue.waiting, tap] };
}

/** The server answered: the tap leaves the line, from either list. */
export function removeTap(queue: TapQueue, id: string): TapQueue {
  return { waiting: queue.waiting.filter((tap) => tap.id !== id), stuck: queue.stuck.filter((tap) => tap.id !== id) };
}

/** One more error answer from the server; the `MAX_SERVER_ERRORS`th moves the tap to `stuck`, so the line carries on. */
export function recordServerError(queue: TapQueue, id: string): TapQueue {
  const tap = queue.waiting.find((candidate) => candidate.id === id);
  if (!tap) return queue;
  const tried = { ...tap, tries: tap.tries + 1 };
  const waiting = queue.waiting.filter((candidate) => candidate.id !== id);
  return tried.tries >= MAX_SERVER_ERRORS
    ? { waiting, stuck: [...queue.stuck, tried] }
    : { ...queue, waiting: queue.waiting.map((candidate) => (candidate.id === id ? tried : candidate)) };
}

/** Only what this school's token may send. Another school's taps stay on the tablet, untouched. */
export function forSchool(queue: TapQueue, schoolId: string): TapQueue {
  return {
    waiting: queue.waiting.filter((tap) => tap.schoolId === schoolId),
    stuck: queue.stuck.filter((tap) => tap.schoolId === schoolId),
  };
}
