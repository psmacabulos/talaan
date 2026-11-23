import { beforeEach, describe, expect, it, vi } from "vitest";

const requireParent = vi.fn();
const deleteParentAccount = vi.fn();

vi.mock("@/data/repositories", () => ({
  parentRepository: {},
  parentStudentLinkRepository: {},
  schoolRepository: {},
  studentRepository: {},
  tapRepository: {},
}));
vi.mock("@/features/parents/api-request", async () => {
  const actual = await vi.importActual<typeof import("@/features/parents/api-request")>(
    "@/features/parents/api-request",
  );
  return { ...actual, requireParent: (request: Request) => requireParent(request) };
});
vi.mock("@/services/parents/delete-parent-account", () => ({
  deleteParentAccount: (...args: unknown[]) => deleteParentAccount(...args),
}));
vi.mock("@/services/parents/children-today", () => ({ childrenToday: vi.fn() }));

import { DELETE } from "./route";

function deleteRequest(body: unknown) {
  return new Request("https://bantayaral.test/api/v1/parents/me", {
    method: "DELETE",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("DELETE /api/v1/parents/me (Step 60.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireParent.mockResolvedValue({ parentId: "parent-1", tokenId: "token-1" });
  });

  it("answers 204 with no body when the account is deleted, using the signed-in parent's id", async () => {
    deleteParentAccount.mockResolvedValue({ ok: true });

    const response = await DELETE(deleteRequest({ password: "Hunter2-secret" }));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(deleteParentAccount).toHaveBeenCalledWith("parent-1", "Hunter2-secret", expect.anything());
  });

  it("answers the sign-in's 401 when there is no signed-in parent, and deletes nothing", async () => {
    requireParent.mockResolvedValue(Response.json({ error: { code: "unauthorized" } }, { status: 401 }));

    const response = await DELETE(deleteRequest({ password: "x" }));

    expect(response.status).toBe(401);
    expect(deleteParentAccount).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_input", 400],
    ["wrong_password", 403],
    ["too_many_tries", 429],
    ["unauthorized", 401],
  ])("answers %s with %i, in the API's one error shape", async (code, status) => {
    deleteParentAccount.mockResolvedValue({ ok: false, code, formError: "A message" });

    const response = await DELETE(deleteRequest({ password: "x" }));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: { code, message: "A message" } });
  });

  it("answers 400 for a body that isn't JSON, without calling the service", async () => {
    const response = await DELETE(deleteRequest("not json"));

    expect(response.status).toBe(400);
    expect(deleteParentAccount).not.toHaveBeenCalled();
  });

  it("never echoes the password back", async () => {
    deleteParentAccount.mockResolvedValue({ ok: false, code: "wrong_password", formError: "That password isn't right." });

    const response = await DELETE(deleteRequest({ password: "Hunter2-secret" }));

    expect(await response.text()).not.toContain("Hunter2");
  });
});
