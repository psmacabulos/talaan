import { createHash } from "node:crypto";
import { photoPath } from "@/features/students/photo";
import type { Card, Student } from "@/features/students/types";
import type { TapStudent } from "@/services/taps/record-tap";

/** What `GET /api/v1/gate/roster` answers: the gate's own copy of who can tap here (Step 46). */
export type GateRoster = {
  cards: { serial: string; studentId: string }[];
  /** `photo` is where to fetch the thumbnail (Step 46.5), or null for initials. */
  students: (TapStudent & { photo: string | null })[];
};

/**
 * The school's active cards, and each of their students once. Cards and
 * students are separate lists so a student appears once, and so a later
 * field on the student (the photo, Step 46.5) never touches the card list.
 * Only name, grade, section and photo: the gate holds nothing it doesn't
 * show. A changed photo has a new key, so the roster's ETag changes and the
 * gate fetches only that one new image.
 */
export function buildGateRoster(cards: Card[], students: Student[]): GateRoster {
  const active = cards.filter((card) => card.status === "active");
  const withCard = new Set(active.map((card) => card.studentId));
  return {
    cards: active
      .map((card) => ({ serial: card.serial, studentId: card.studentId }))
      .sort((a, b) => a.serial.localeCompare(b.serial)),
    students: students
      .filter((student) => withCard.has(student.id))
      .map(({ id, firstName, lastName, gradeLevel, section, photoKey }) => ({
        id,
        firstName,
        lastName,
        gradeLevel,
        section,
        photo: photoKey ? photoPath(photoKey) : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** A short, quoted tag for the roster's exact content: the same roster always gets the same tag. */
export function rosterETag(body: string): string {
  return `"${createHash("sha256").update(body).digest("base64url").slice(0, 27)}"`;
}
