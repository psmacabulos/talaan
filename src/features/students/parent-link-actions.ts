"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { parentStudentLinkRepository } from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getSession } from "@/lib/session";

export type ParentLinkActionResult = { ok: true } | { ok: false; error: string };

const NOT_ALLOWED = "You don't have permission to manage parent accounts.";

/** A link's or block's id, as the drawer sends it. A Server Action can be called with anything. */
const idSchema = z.string().min(1).max(64);

/** A principal or super admin with a school open; everything they do here is at that school. */
async function manager(): Promise<{ schoolId: string; staffId: string } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") return { error: NOT_ALLOWED };
  return { schoolId: session.schoolId, staffId: session.userId };
}

/**
 * Step 55.4's "Remove", from the student drawer after a confirmation: the
 * parent stops seeing the child at once, their pushes about the child that
 * haven't gone are dropped, and they can't link the child again until the
 * school allows it. Nobody is told.
 */
export async function removeParentLink(linkId: unknown): Promise<ParentLinkActionResult> {
  const caller = await manager();
  if ("error" in caller) return { ok: false, error: caller.error };
  const id = idSchema.safeParse(linkId);
  if (!id.success) return { ok: false, error: "That parent account was already removed." };

  const removed = await parentStudentLinkRepository.removeInSchool(caller.schoolId, id.data, caller.staffId);
  if (!removed) return { ok: false, error: "That parent account was already removed." };

  refresh();
  return { ok: true };
}

/** Step 55.4's "Allow again": that parent can link the child again, with the right details. */
export async function allowParentLinkAgain(blockId: unknown): Promise<ParentLinkActionResult> {
  const caller = await manager();
  if ("error" in caller) return { ok: false, error: caller.error };
  const id = idSchema.safeParse(blockId);
  if (!id.success) return { ok: false, error: "That parent can already link this child." };

  const allowed = await parentStudentLinkRepository.allowAgainInSchool(caller.schoolId, id.data);
  if (!allowed) return { ok: false, error: "That parent can already link this child." };

  refresh();
  return { ok: true };
}
