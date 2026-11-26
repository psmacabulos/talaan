import { z } from "zod";

/** The shortest and longest notice a school can publish (Step 60.4). The database checks the longest too. */
export const NOTICE_MIN_LENGTH = 200;
export const NOTICE_MAX_LENGTH = 20_000;

/**
 * The text as it is stored: Windows and old Mac line endings become `\n`,
 * and the ends are trimmed. Spaces inside a line are kept as typed, so
 * text pasted from a Word document shows as it was.
 */
export function normalizeNotice(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

/** A notice's wording, shared by the Settings form and the server. */
export const noticeBodySchema = z
  .string()
  .transform(normalizeNotice)
  .pipe(
    z
      .string()
      .min(
        NOTICE_MIN_LENGTH,
        `Write at least ${NOTICE_MIN_LENGTH} characters: what the school keeps about students, why, and who to ask.`,
      )
      .max(
        NOTICE_MAX_LENGTH,
        `Keep it to ${NOTICE_MAX_LENGTH.toLocaleString("en-US")} characters (about eight pages).`,
      ),
  );

/**
 * "Publish" from Settings: the wording, and the version the form was
 * editing (0 when the school has none yet), so a form left open while
 * someone else published is refused instead of skipping their version.
 */
export const publishNoticeSchema = z.object({
  body: noticeBodySchema,
  basedOnVersion: z.number().int().min(0).max(1_000_000),
});
