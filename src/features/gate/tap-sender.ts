import { GateOfflineError, GateServerError, GateUnauthorizedError } from "./gate-client";
import type { GateTapResponse } from "./responses";
import { addTap, recordServerError, removeTap, type QueuedTap, type TapQueue } from "./tap-queue";

/** What the gate's strip shows about the line. */
export type QueueSummary = {
  /** This school's taps waiting their turn: one already on its way isn't counted, so a normal tap never flashes "waiting". */
  waiting: number;
  /** This school's taps the server kept refusing. */
  stuck: number;
  /** Taps saved for another school, left alone (decision 7). */
  otherSchool: number;
  /** The last save failed: the line lives only in this page until storage frees up. */
  storageFull: boolean;
};

export type TapSenderDeps = {
  /** Only this school's taps are sent. */
  schoolId: string;
  load: () => TapQueue;
  save: (queue: TapQueue) => "saved" | "full";
  /** Sends one tap. Throws the errors above. */
  send: (tap: QueuedTap) => Promise<GateTapResponse>;
  /** The server answered this tap. */
  onAnswer: (id: string, response: GateTapResponse) => void;
  /** This tap couldn't be sent this time; it stays saved. */
  onUnsent: (id: string) => void;
  /** The token was refused: stop, the page disconnects. The line stays saved. */
  onUnauthorized: () => void;
  onChange: (summary: QueueSummary) => void;
};

/**
 * Sends the gate's waiting line (Step 58, decisions 2–6). Every tap is
 * saved before it's sent. With nothing else waiting, a new tap goes at
 * once, without waiting for any other (Step 47). Otherwise it joins the
 * end, and the line goes one tap at a time, oldest first, each waiting for
 * its answer, so the server sees a student's taps in the order they were
 * read (Step 56's note). The line stops at the first failure; the page
 * calls `kick()` to try again.
 */
export function createTapSender(deps: TapSenderDeps) {
  let queue = deps.load();
  let storageFull = false;
  let draining = false;
  let stopped = false;
  const inFlight = new Set<string>();

  const mine = (taps: QueuedTap[]) => taps.filter((tap) => tap.schoolId === deps.schoolId);

  /**
   * Changes the line from what storage holds now, not this sender's own
   * copy: after Disconnect and a new connection, a send still on its way
   * from before mustn't save an old line over the new one (Step 58's code
   * review). Only while storage is full does this page's copy lead, since
   * it holds taps storage couldn't.
   */
  function update(change: (current: TapQueue) => TapQueue) {
    queue = change(storageFull ? queue : deps.load());
    storageFull = deps.save(queue) === "full";
    if (!stopped) deps.onChange(summary());
  }

  function summary(): QueueSummary {
    return {
      waiting: mine(queue.waiting).filter((tap) => !inFlight.has(tap.id)).length,
      stuck: mine(queue.stuck).length,
      otherSchool: queue.waiting.length + queue.stuck.length - mine(queue.waiting).length - mine(queue.stuck).length,
      storageFull,
    };
  }

  /** Sends one tap. True when the line can go on to the next one. */
  async function sendOne(tap: QueuedTap, from: "waiting" | "stuck"): Promise<boolean> {
    inFlight.add(tap.id);
    try {
      const response = await deps.send(tap);
      update((current) => removeTap(current, tap.id));
      // Stopped while it was on its way: the answer still empties its place in the line, and nothing more.
      if (stopped) return false;
      deps.onAnswer(tap.id, response);
      return true;
    } catch (error) {
      if (stopped) return false;
      if (error instanceof GateUnauthorizedError) {
        stopped = true;
        deps.onUnauthorized();
        return false;
      }
      if (error instanceof GateServerError && from === "waiting")
        update((current) => recordServerError(current, tap.id));
      // GateOfflineError, or anything unexpected: treated as no connection, the tap stays saved.
      if (!(error instanceof GateOfflineError || error instanceof GateServerError)) console.error(error);
      deps.onUnsent(tap.id);
      return false;
    } finally {
      inFlight.delete(tap.id);
      if (!stopped) deps.onChange(summary());
    }
  }

  async function drain() {
    if (draining || stopped) return;
    draining = true;
    try {
      for (;;) {
        const next = mine(queue.waiting).find((tap) => !inFlight.has(tap.id));
        if (!next || !(await sendOne(next, "waiting"))) break;
      }
    } finally {
      draining = false;
    }
  }

  return {
    /** The school whose taps this sender sends: a new tap is saved under it. */
    schoolId: deps.schoolId,
    summary,
    /** Saves a new tap, then sends it now (nothing else waiting) or in its turn. "waiting" means in its turn. */
    add(tap: QueuedTap): "sending" | "waiting" {
      // Nothing older waiting its turn, and the line isn't being sent: this
      // one goes at once, and counts as on its way from the start.
      const goesNow = !stopped && !draining && mine(queue.waiting).every((other) => inFlight.has(other.id));
      if (goesNow) inFlight.add(tap.id);
      update((current) => addTap(current, tap));
      if (goesNow) {
        void sendOne(tap, "waiting");
        return "sending";
      }
      void drain();
      return "waiting";
    },
    /** Sends the waiting line, if it isn't being sent already. Safe to call often. */
    kick(): void {
      void drain();
    },
    /** Tries the stuck taps once more (every 10 minutes), stopping at the first that still fails. */
    async retryStuck(): Promise<void> {
      if (draining || stopped) return;
      draining = true;
      try {
        for (const tap of mine(queue.stuck)) {
          if (!(await sendOne(tap, "stuck"))) break;
        }
      } finally {
        draining = false;
      }
    },
    /** The page is disconnecting: send nothing more. */
    stop(): void {
      stopped = true;
    },
  };
}

export type TapSender = ReturnType<typeof createTapSender>;
