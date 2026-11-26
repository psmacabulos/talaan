/**
 * What the privacy notice form and its server action say (Step 60.4). Kept
 * out of `privacy-actions.ts`, since a "use server" file may export only
 * async functions (P-070).
 */
export const NOTICE_NOT_ALLOWED_MESSAGE = "Only a principal or super admin can publish the school's privacy notice.";

export const NOTICE_STALE_MESSAGE =
  "Someone published a new version while you were editing. Copy your text, then reload the page to see theirs.";

export function sameTextMessage(version: number): string {
  return `This is the same as version ${version}. Change the wording to publish a new version.`;
}
