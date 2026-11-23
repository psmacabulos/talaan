import { z } from "zod";
import { AUDIT_GROUPS, type AuditGroupId } from "./groups";
import type { AuditCursor } from "./types";

export type ActivityParams = { group: AuditGroupId | "all"; before: AuditCursor | null };

export const ACTIVITY_PAGE_SIZE = 25;

const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() });

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** "2026-06-19T01:00:00.000Z_<uuid>": a time never has an underscore, so the first one splits it. */
export function encodeCursor(cursor: AuditCursor): string {
  return `${cursor.createdAt}_${cursor.id}`;
}

function decodeCursor(raw: string | undefined): AuditCursor | null {
  if (!raw) return null;
  const split = raw.indexOf("_");
  if (split === -1) return null;
  const parsed = cursorSchema.safeParse({ createdAt: raw.slice(0, split), id: raw.slice(split + 1) });
  return parsed.success ? parsed.data : null;
}

/**
 * The page's URL, read safely: a hand-edited or stale address falls back to
 * "everything, newest first" instead of an error page (the same rule as the
 * Students list).
 */
export function parseActivityParams(raw: Record<string, string | string[] | undefined>): ActivityParams {
  const group = firstValue(raw.group);
  return {
    group: AUDIT_GROUPS.find((candidate) => candidate.id === group)?.id ?? "all",
    before: decodeCursor(firstValue(raw.before)),
  };
}

/** The page's address for these choices, with only what differs from the default. */
export function activityHref(params: { group: AuditGroupId | "all"; before?: AuditCursor | null }): string {
  const query = new URLSearchParams();
  if (params.group !== "all") query.set("group", params.group);
  if (params.before) query.set("before", encodeCursor(params.before));
  const text = query.toString();
  return text ? `/activity?${text}` : "/activity";
}
