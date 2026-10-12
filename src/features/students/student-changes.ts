import { z } from "zod";

/**
 * What the drawer's ID card box will do when the student form is saved.
 * Nothing about a card is saved before that: a card tapped by mistake is
 * undone with Undo or Cancel, and is never marked lost (asked for by the
 * owner, 2026-10-12).
 */
export type PendingCard = {
  /** Mark the student's current active card lost, first. */
  replaceLost: boolean;
  /** The card to link: one the reader read (already checked), or a demo tap's made-up serial. */
  link: { kind: "reader"; serial: string } | { kind: "simulated" } | null;
};

export const NO_CARD_CHANGE: PendingCard = { replaceLost: false, link: null };

/** Everything besides the form fields that the Save button saves. The photo itself travels as FormData. */
export type StudentChanges = { card: PendingCard; removePhoto: boolean };

export const NO_STUDENT_CHANGES: StudentChanges = { card: NO_CARD_CHANGE, removePhoto: false };

/** The server re-checks the shape: a Server Function can be called with anything. */
export const studentChangesSchema = z.object({
  card: z.object({
    replaceLost: z.boolean(),
    link: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("reader"), serial: z.string().max(64) }),
        z.object({ kind: z.literal("simulated") }),
      ])
      .nullable(),
  }),
  removePhoto: z.boolean(),
});

export function hasCardChange(card: PendingCard): boolean {
  return card.replaceLost || card.link !== null;
}
