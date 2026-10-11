import type { RecordTapResult, TapStudent } from "@/services/taps/record-tap";

/** What `POST /api/v1/gate/taps` answers: just what the gate's screen needs, never an LRN, birth date or guardian. */
export type GateTapResponse =
  | {
      outcome: "recorded";
      direction: "time_in" | "time_out";
      tappedAt: string;
      notified: boolean;
      replayed: boolean;
      student: TapStudent;
    }
  | { outcome: "duplicate"; previousTappedAt: string; student: TapStudent | null }
  | { outcome: "lost_card"; tappedAt: string; cardSerial: string; replayed: boolean; student: TapStudent | null }
  | { outcome: "unknown_card"; tappedAt: string; cardSerial: string; replayed: boolean }
  | { outcome: "invalid_serial" };

function pickStudent(student: TapStudent): TapStudent {
  const { id, firstName, lastName, gradeLevel, section } = student;
  return { id, firstName, lastName, gradeLevel, section };
}

/** `recordTap()`'s answer, reshaped for the wire. Copies field by field, so nothing new can leak out by accident. */
export function toGateTapResponse(result: RecordTapResult): GateTapResponse {
  switch (result.outcome) {
    case "recorded":
      return {
        outcome: "recorded",
        direction: result.direction,
        tappedAt: result.tap.tappedAt,
        notified: result.notified,
        replayed: result.replayed,
        student: pickStudent(result.student),
      };
    case "duplicate":
      return {
        outcome: "duplicate",
        previousTappedAt: result.previousTap.tappedAt,
        student: result.student ? pickStudent(result.student) : null,
      };
    case "lost_card":
      return {
        outcome: "lost_card",
        tappedAt: result.tap.tappedAt,
        cardSerial: result.tap.cardSerial,
        replayed: result.replayed,
        student: result.student ? pickStudent(result.student) : null,
      };
    case "unknown_card":
      return {
        outcome: "unknown_card",
        tappedAt: result.tap.tappedAt,
        cardSerial: result.tap.cardSerial,
        replayed: result.replayed,
      };
    case "invalid_serial":
      return { outcome: "invalid_serial" };
  }
}
