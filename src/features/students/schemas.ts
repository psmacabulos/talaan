import { z } from "zod";

/**
 * Grade 7 to 12 only (CLAUDE.md's domain rules). A literal union, not
 * `z.number().int().min(7).max(12)`, so the inferred TypeScript type is
 * `7 | 8 | 9 | 10 | 11 | 12` — useful anywhere code needs to switch on a
 * specific grade, not just check a range.
 */
export const gradeLevelSchema = z.union([
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
]);

/** Exactly 12 digits — DepEd's Learner Reference Number. Optional on a student. */
export const lrnSchema = z.string().regex(/^\d{12}$/, "LRN must be exactly 12 digits");

/**
 * Uppercase hex byte pairs joined by colons (CLAUDE.md's example:
 * "04:A3:5F:2B:91:C0:80", a 7-byte UID). Real NFC UIDs are commonly 4, 7 or
 * 10 bytes, so this accepts 4-10 groups rather than one fixed length.
 */
export const cardSerialSchema = z
  .string()
  .regex(/^([0-9A-F]{2}:){3,9}[0-9A-F]{2}$/, "Enter an uppercase hex serial like 04:A3:5F:2B:91:C0:80");

/** Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX. */
export const phMobileSchema = z
  .string()
  .regex(/^(09\d{9}|\+639\d{9})$/, "Enter a valid PH mobile number, e.g. 09171234567");

export const studentSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  firstName: z.string().min(1, "Enter a first name"),
  middleName: z.string().min(1).optional(),
  lastName: z.string().min(1, "Enter a last name"),
  // Store the birth date, never a computed age (CLAUDE.md: "show age, never
  // store age") — a plain calendar date, not a date+time.
  birthDate: z.iso.date(),
  lrn: lrnSchema.optional(),
  gradeLevel: gradeLevelSchema,
  section: z.string().min(1, "Enter a section"),
  guardianName: z.string().min(1, "Enter a guardian name"),
  guardianMobile: phMobileSchema,
  // For a station's optional tap-confirmation display (a monitor showing
  // who's tapping) — not required, most schools won't have this on day one.
  photoUrl: z.url().optional(),
});

export const cardStatusSchema = z.enum(["active", "lost", "retired"]);

export const cardSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  serial: cardSerialSchema,
  status: cardStatusSchema,
  // When this card was linked to its student — not when the physical card
  // was manufactured.
  linkedAt: z.iso.datetime(),
});
