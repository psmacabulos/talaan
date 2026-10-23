import { formatSchoolTime } from "@/lib/school-time";
import type { GateTapResponse } from "./responses";
import type { RosterStudent } from "./roster-match";

/** One card read at the gate, from the moment it's read until the server answers. */
export type GateScan = {
  id: string;
  raw: string;
  scannedAt: string;
  /** Who the gate's own roster says it is, shown before the server answers. */
  rosterStudent: RosterStudent | null;
  /** "saved": not sent yet, kept on the tablet and sent when the connection allows (Step 58). */
  state: { kind: "checking" } | { kind: "saved" } | { kind: "answered"; response: GateTapResponse };
};

/** The fixed status colours (never themed): green, amber, red, grey. Amber is also "stop and check". */
export type GateTone = "present" | "late" | "absent" | "idle";

/**
 * Every state a tap card can show, on the gate and on the guardhouse
 * monitor alike (`tap-card.tsx`). Time in and time out are told apart by
 * colour too: green and blue.
 */
export type TapKind =
  "checking" | "saved" | "time_in" | "time_out" | "duplicate" | "lost_card" | "unknown_card" | "invalid_serial";

export type GateDisplay = {
  tone: GateTone;
  kind: TapKind;
  /** "Juan Cruz", or null when nobody is known for this card. */
  name: string | null;
  /** "Grade 7 – Rizal". */
  grade: string | null;
  /** The big line: "Time in 7:56 AM", "Already tapped at 7:56 AM", … */
  message: string;
  /** The same, in a few words, for the Recent list. */
  short: string;
  /** When it happened: the stored tap's time once the server has answered, else when the card was read. */
  at: string;
  /** The time the card's stamp shows: the tap's (an unknown card's too), or for a duplicate the earlier tap's. Null when there's no stamp. */
  stampAt: string | null;
  /** What to do next, under the badge when there's no stamp: "Please see the office." */
  detail: string | null;
};

/** What the person at the gate is told about an unknown card. */
export const UNKNOWN_CARD_GATE_DETAIL = "Please ask the gate attendant for assistance.";

/** A tap kept on the tablet until the connection is back (Step 58). */
export const SAVED_MESSAGE = "Saved. It will be sent when the connection is back.";

/** The same, for a card this gate's roster doesn't know. */
export const SAVED_UNLISTED_MESSAGE = "Saved. Not on this gate's list.";

/** What the guard is told about one, on the monitor. */
export const UNKNOWN_CARD_MONITOR_DETAIL = "Check this person before letting them in.";

type Named = { firstName: string; lastName: string; gradeLevel: number; section: string };

function who(student: Named | null): Pick<GateDisplay, "name" | "grade"> {
  return student
    ? { name: `${student.firstName} ${student.lastName}`, grade: `Grade ${student.gradeLevel} – ${student.section}` }
    : { name: null, grade: null };
}

/** What the gate screen says about one scan. The server's answer wins over the roster's guess. */
export function describeScan(scan: GateScan): GateDisplay {
  const guessed = who(scan.rosterStudent);
  const at = scan.scannedAt;
  if (scan.state.kind === "checking") {
    return {
      tone: "idle",
      kind: "checking",
      ...guessed,
      message: "Checking…",
      short: "Checking…",
      at,
      stampAt: null,
      detail: null,
    };
  }
  if (scan.state.kind === "saved") {
    // Grey, not green: nothing is confirmed until the server answers. A
    // card the roster doesn't know (unknown, or lost: the roster leaves
    // lost cards out) gets no welcome, only a word to the attendant.
    return scan.rosterStudent
      ? {
          tone: "idle",
          kind: "saved",
          ...guessed,
          message: SAVED_MESSAGE,
          short: "Saved",
          at,
          stampAt: null,
          detail: SAVED_MESSAGE,
        }
      : {
          tone: "idle",
          kind: "saved",
          ...guessed,
          message: `${SAVED_UNLISTED_MESSAGE} ${UNKNOWN_CARD_GATE_DETAIL}`,
          short: "Saved",
          at,
          stampAt: null,
          detail: `${SAVED_UNLISTED_MESSAGE} ${UNKNOWN_CARD_GATE_DETAIL}`,
        };
  }

  const response = scan.state.response;
  switch (response.outcome) {
    case "recorded": {
      const label = response.direction === "time_in" ? "Time in" : "Time out";
      return {
        tone: "present",
        kind: response.direction,
        ...who(response.student),
        message: `${label} ${formatSchoolTime(response.tappedAt)}`,
        short: label,
        at: response.tappedAt,
        stampAt: response.tappedAt,
        detail: null,
      };
    }
    case "duplicate":
      return {
        tone: "late",
        ...(response.student ? who(response.student) : guessed),
        kind: "duplicate",
        message: `Already tapped at ${formatSchoolTime(response.previousTappedAt)}`,
        short: "Already tapped",
        at,
        stampAt: response.previousTappedAt,
        detail: null,
      };
    case "lost_card":
      return {
        tone: "absent",
        ...who(response.student),
        kind: "lost_card",
        message: "This card was reported lost. Please see the office.",
        short: "Lost card",
        at: response.tappedAt,
        stampAt: null,
        detail: "Please see the office.",
      };
    case "unknown_card":
      // Somebody without a card of this school: staff have to check them
      // (owner review, 2026-10-13). Amber, not red: a warning, not an
      // alarm. Red stays for a card reported lost.
      return {
        tone: "late",
        name: null,
        grade: null,
        kind: "unknown_card",
        message: `Unknown card. ${UNKNOWN_CARD_GATE_DETAIL}`,
        short: "Awaiting staff assistance",
        at: response.tappedAt,
        stampAt: response.tappedAt,
        detail: UNKNOWN_CARD_GATE_DETAIL,
      };
    case "invalid_serial":
      return {
        tone: "idle",
        name: null,
        grade: null,
        kind: "invalid_serial",
        message: "Couldn't read the card. Tap again.",
        short: "Couldn't read",
        at,
        stampAt: null,
        detail: "Tap the card again.",
      };
  }
}
