import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const publishNotice = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("@/services/privacy/publish-notice", () => ({
  publishNotice: (...args: unknown[]) => publishNotice(...args),
}));

import { publishPrivacyNotice } from "./privacy-actions";
import { NOTICE_NOT_ALLOWED_MESSAGE, NOTICE_STALE_MESSAGE, sameTextMessage } from "./privacy-messages";

const principal = { userId: "staff-1", role: "principal", schoolId: "school-a" };
const input = { body: "x".repeat(200), basedOnVersion: 0 };

describe("publishPrivacyNotice (Step 60.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(principal);
  });

  it("publishes through the service with the session, and refreshes Settings", async () => {
    publishNotice.mockResolvedValue({ ok: true, version: 1 });

    await expect(publishPrivacyNotice(input)).resolves.toEqual({ ok: true, version: 1 });

    expect(publishNotice).toHaveBeenCalledWith(principal, input);
    expect(refresh).toHaveBeenCalled();
  });

  it("asks to sign in when signed out", async () => {
    getSession.mockResolvedValue(null);

    const result = await publishPrivacyNotice(input);

    expect(result).toMatchObject({ ok: false, formError: expect.any(String) });
    expect(publishNotice).not.toHaveBeenCalled();
  });

  it("puts wording problems under the text box and the rest above the button", async () => {
    publishNotice.mockResolvedValueOnce({ ok: false, code: "invalid", message: "Too short" });
    await expect(publishPrivacyNotice(input)).resolves.toEqual({ ok: false, fieldError: "Too short" });

    publishNotice.mockResolvedValueOnce({ ok: false, code: "same_text", version: 2 });
    await expect(publishPrivacyNotice(input)).resolves.toEqual({ ok: false, fieldError: sameTextMessage(2) });

    publishNotice.mockResolvedValueOnce({ ok: false, code: "stale" });
    await expect(publishPrivacyNotice(input)).resolves.toEqual({ ok: false, formError: NOTICE_STALE_MESSAGE });

    publishNotice.mockResolvedValueOnce({ ok: false, code: "not_allowed" });
    await expect(publishPrivacyNotice(input)).resolves.toEqual({ ok: false, formError: NOTICE_NOT_ALLOWED_MESSAGE });

    expect(refresh).not.toHaveBeenCalled();
  });
});
