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
  state: { kind: "checking" } | { kind: "answered"; response: GateTapResponse } | { kind: "failed" };
};

/** The fixed status colours (never themed): green, amber, red, grey. */
export type GateTone = "present" | "late" | "absent" | "idle";

/**
 * Every state a tap card can show, on the gate and on the guardhouse
 * monitor alike (`tap-card.tsx`). Time in and time out are told apart by
 * colour too: green and blue.
 */
export type TapKind =
  "checking" | "time_in" | "time_out" | "duplicate" | "lost_card" | "unknown_card" | "invalid_serial" | "not_sent";

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
  /** The time the card's stamp shows: the tap's, or for a duplicate the earlier tap's. Null when there's no stamp. */
  stampAt: string | null;
  /** What to do next, under the badge when there's no stamp: "Please see the office." */
  detail: string | null;
};

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
  if (scan.state.kind === "failed") {
    return {
      tone: "idle",
      kind: "not_sent",
      ...guessed,
      message: "Not sent: no connection.",
      short: "Not sent",
      at,
      stampAt: null,
      detail: "No connection. The tap wasn't recorded; tap again.",
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
      return {
        tone: "idle",
        name: null,
        grade: null,
        kind: "unknown_card",
        message: "Card not recognised. Please see the office.",
        short: "Not recognised",
        at: response.tappedAt,
        stampAt: null,
        detail: "Please see the office.",
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
