import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const exportStudentData = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
vi.mock("@/services/students/student-privacy", () => ({
  exportStudentData: (...args: unknown[]) => exportStudentData(...args),
}));

import { GET } from "./route";

const principal = { userId: "staff-1", role: "principal", schoolId: "school-a" };
const call = (id = "student-1") =>
  GET(new Request("https://bantayaral.test/students/x/export"), { params: Promise.resolve({ id }) });

describe("GET /students/[id]/export (Step 60.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(principal);
  });

  it("sends the file as a download that is never cached", async () => {
    exportStudentData.mockResolvedValue({
      ok: true,
      fileName: "bantay-aral-dela-cruz-2026-06-19.json",
      body: '{"a":1}',
    });

    const response = await call();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"a":1}');
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="bantay-aral-dela-cruz-2026-06-19.json"',
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(exportStudentData).toHaveBeenCalledWith(principal, "student-1");
  });

  it("answers 401 when signed out, without reading anything", async () => {
    getSession.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(exportStudentData).not.toHaveBeenCalled();
  });

  it.each([
    ["forbidden", 403],
    ["not_found", 404],
  ])("answers %s with %i, never cached", async (code, status) => {
    exportStudentData.mockResolvedValue({ ok: false, code });

    const response = await call();

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toBeNull();
  });
});
