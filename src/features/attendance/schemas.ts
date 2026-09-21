import { z } from "zod";
import { cardSerialSchema } from "@/features/students/schemas";

export const tapSchema = z.object({
  // Made by the tapping device itself, not the server — this is what makes
  // a tap idempotent (CLAUDE.md: "repeated taps within a few minutes are
  // ignored"). A repository can safely ignore any tap whose id it's already
  // seen, no matter how many times the request is retried.
  id: z.uuid(),
  schoolId: z.string().min(1),
  stationId: z.string().min(1),
  cardSerial: cardSerialSchema,
  // The student linked to `cardSerial` at the moment of the tap, captured
  // here rather than looked up later — so re-linking a card afterwards can
  // never rewrite what an old tap "meant". `null` if the serial wasn't
  // linked to anyone (an unknown-card result at the station).
  studentId: z.string().min(1).nullable(),
  tappedAt: z.iso.datetime(),
});

/** Only one kind of alert exists so far: a lost card was tapped at a station. */
export const alertTypeSchema = z.enum(["lost_card_tapped"]);

export const alertSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  tapId: z.string().min(1),
  type: alertTypeSchema,
  createdAt: z.iso.datetime(),
  acknowledged: z.boolean(),
});
