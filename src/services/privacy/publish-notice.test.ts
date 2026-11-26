import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrivacyNotice } from "@/features/privacy/types";
import { publishNotice, type PublishNoticeDeps } from "./publish-notice";

const BODY = "Our school keeps attendance. ".repeat(10).trim();
const principal = { userId: "staff-1", role: "principal", schoolId: "school-a" } as const;
const superAdmin = { userId: "super-1", role: "super_admin", schoolId: "school-a" } as const;

function deps(current: PrivacyNotice | null = null) {
  const notices = {
    current: vi.fn<PublishNoticeDeps["notices"]["current"]>().mockResolvedValue(current),
    publish: vi.fn<PublishNoticeDeps["notices"]["publish"]>().mockResolvedValue({ ok: true, version: 1 }),
  };
  return { notices };
}

describe("publishNotice (Step 60.4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes version 1 for the session's school, with the principal as the actor", async () => {
    const d = deps();

    await expect(publishNotice(principal, { body: `  ${BODY}\r\n`, basedOnVersion: 0 }, d)).resolves.toEqual({
      ok: true,
      version: 1,
    });

    expect(d.notices.publish).toHaveBeenCalledWith("school-a", BODY, 0, { id: "staff-1", role: "principal" });
  });

  it("lets a super admin with the school open publish for a busy principal", async () => {
    const d = deps();

    await publishNotice(superAdmin, { body: BODY, basedOnVersion: 0 }, d);

    expect(d.notices.publish).toHaveBeenCalledWith("school-a", BODY, 0, { id: "super-1", role: "super_admin" });
  });

  it("refuses a teacher and a super admin with no school open, writing nothing", async () => {
    for (const session of [
      { userId: "t", role: "teacher", schoolId: "school-a" } as const,
      { userId: "s", role: "super_admin", schoolId: null } as const,
    ]) {
      const d = deps();
      await expect(publishNotice(session, { body: BODY, basedOnVersion: 0 }, d)).resolves.toEqual({
        ok: false,
        code: "not_allowed",
      });
      expect(d.notices.current).not.toHaveBeenCalled();
      expect(d.notices.publish).not.toHaveBeenCalled();
    }
  });

  it("refuses wording that's too short, with the schema's message", async () => {
    const d = deps();

    const result = await publishNotice(principal, { body: "Too short", basedOnVersion: 0 }, d);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
    expect(result.ok === false && result.code === "invalid" && result.message).toMatch(/at least 200/);
    expect(d.notices.publish).not.toHaveBeenCalled();
  });

  it("refuses the same text as the current version", async () => {
    const d = deps({ schoolId: "school-a", version: 2, body: BODY, publishedAt: "2026-11-01T00:00:00.000Z" });

    await expect(publishNotice(principal, { body: `${BODY}\n`, basedOnVersion: 2 }, d)).resolves.toEqual({
      ok: false,
      code: "same_text",
      version: 2,
    });
    expect(d.notices.publish).not.toHaveBeenCalled();
  });

  it("answers stale when the form was editing an older version, or the repository lost the race", async () => {
    const current = { schoolId: "school-a", version: 3, body: "Old", publishedAt: "2026-11-01T00:00:00.000Z" };
    const d = deps(current);

    await expect(publishNotice(principal, { body: BODY, basedOnVersion: 2 }, d)).resolves.toEqual({
      ok: false,
      code: "stale",
    });
    expect(d.notices.publish).not.toHaveBeenCalled();

    d.notices.publish.mockResolvedValue({ ok: false, reason: "stale" });
    await expect(publishNotice(principal, { body: BODY, basedOnVersion: 3 }, d)).resolves.toEqual({
      ok: false,
      code: "stale",
    });
  });
});
