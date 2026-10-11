import { describe, expect, it, vi } from "vitest";
import type { Device } from "@/features/devices/types";
import type { Session } from "@/lib/session";

// The resolver reads cookies; this test is only about the decision.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
const { monitorViewerFrom } = await import("./monitor-viewer");

const device = (kind: Device["kind"]): Device => ({
  id: "d1",
  schoolId: "school-a",
  label: "Guardhouse TV",
  kind,
  status: "active",
  lastSeenAt: null,
});
const session = (role: Session["role"], schoolId: string | null = "school-a"): Session => ({
  userId: "u1",
  role,
  schoolId,
});

describe("monitorViewerFrom", () => {
  it("lets a monitor device watch its own school", () => {
    expect(monitorViewerFrom(device("monitor"), null)).toEqual({ schoolId: "school-a", kind: "monitor" });
  });

  it("refuses a gate device: a gate records, it doesn't watch", () => {
    expect(monitorViewerFrom(device("gate"), session("principal"))).toBeNull();
  });

  it("lets a principal, or a super admin with a school, watch that school", () => {
    expect(monitorViewerFrom(null, session("principal"))).toEqual({ schoolId: "school-a", kind: "staff" });
    expect(monitorViewerFrom(null, session("super_admin"))).toEqual({ schoolId: "school-a", kind: "staff" });
  });

  it("refuses a teacher, a super admin with no school, and nobody", () => {
    expect(monitorViewerFrom(null, session("teacher"))).toBeNull();
    expect(monitorViewerFrom(null, session("super_admin", null))).toBeNull();
    expect(monitorViewerFrom(null, null)).toBeNull();
  });
});
