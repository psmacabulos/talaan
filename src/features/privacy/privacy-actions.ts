"use server";

import { refresh } from "next/cache";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getSession } from "@/lib/session";
import { publishNotice } from "@/services/privacy/publish-notice";
import { NOTICE_NOT_ALLOWED_MESSAGE, NOTICE_STALE_MESSAGE, sameTextMessage } from "./privacy-messages";

export type PublishNoticeActionResult =
  { ok: true; version: number } | { ok: false; fieldError: string } | { ok: false; formError: string };

/**
 * "Publish" on Settings > Privacy notice (Step 60.4). `publishNotice` holds
 * the rules; this turns its answer into what the form shows: a problem with
 * the wording under the text box, anything else above the button.
 */
export async function publishPrivacyNotice(input: unknown): Promise<PublishNoticeActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };

  const result = await publishNotice(session, input);
  if (result.ok) {
    refresh();
    return { ok: true, version: result.version };
  }
  if (result.code === "invalid") return { ok: false, fieldError: result.message };
  if (result.code === "same_text") return { ok: false, fieldError: sameTextMessage(result.version) };
  if (result.code === "stale") return { ok: false, formError: NOTICE_STALE_MESSAGE };
  return { ok: false, formError: NOTICE_NOT_ALLOWED_MESSAGE };
}
