import { EventEmitter } from "node:events";
import type { TapStudent } from "./record-tap";

/** One stored tap, as the guardhouse monitor shows it (Step 48). Nothing more personal than the gate shows. */
export type GateTapEvent = {
  id: string;
  outcome: "recorded" | "lost_card" | "unknown_card";
  direction: "time_in" | "time_out" | null;
  tappedAt: string;
  student: (TapStudent & { photo: string | null }) | null;
};

/**
 * Taps passed from whoever stored them to every open monitor of the same
 * school, in this server's own memory: no extra service, nothing to pay
 * for. It only reaches monitors connected to this same server process,
 * which is what one Heroku Basic dyno is. Running on more than one would
 * mean swapping this for Postgres LISTEN/NOTIFY behind the same two
 * functions (docs/GATE.md). Kept on globalThis, like the Prisma client, so
 * a development reload doesn't split it in two.
 */
const globalForTaps = globalThis as unknown as { tapEvents?: EventEmitter };
const emitter = globalForTaps.tapEvents ?? new EventEmitter();
// Every open monitor and principal's tab is one listener; the default
// warning at 10 is meant for leaks, not for a school with several screens.
emitter.setMaxListeners(0);
globalForTaps.tapEvents = emitter;

/** One channel per school: a listener can never hear another school's taps. */
function channel(schoolId: string): string {
  return `school:${schoolId}`;
}

export function publishTap(schoolId: string, event: GateTapEvent): void {
  emitter.emit(channel(schoolId), event);
}

/** Starts listening; returns the "stop listening" function. */
export function subscribeToTaps(schoolId: string, listener: (event: GateTapEvent) => void): () => void {
  emitter.on(channel(schoolId), listener);
  return () => emitter.off(channel(schoolId), listener);
}
