import { describe, expect, it, vi } from "vitest";
import { markAlertHandled } from "./mark-alert-handled";

function fakeAlerts(answer = true) {
  return { acknowledge: vi.fn(async () => answer) };
}

describe("markAlertHandled", () => {
  it("refuses a teacher without touching the alerts", async () => {
    const alerts = fakeAlerts();
    await expect(
      markAlertHandled({ schoolId: "school-a", alertId: "alert-1", role: "teacher" }, { alerts }),
    ).resolves.toBe("not_allowed");
    expect(alerts.acknowledge).not.toHaveBeenCalled();
  });

  it.each(["principal", "super_admin"] as const)("lets a %s mark their school's alert handled", async (role) => {
    const alerts = fakeAlerts();
    await expect(markAlertHandled({ schoolId: "school-a", alertId: "alert-1", role }, { alerts })).resolves.toBe(
      "handled",
    );
    expect(alerts.acknowledge).toHaveBeenCalledWith("school-a", "alert-1");
  });

  it("answers not found for an alert this school doesn't have", async () => {
    const alerts = fakeAlerts(false);
    await expect(
      markAlertHandled({ schoolId: "school-a", alertId: "alert-other", role: "principal" }, { alerts }),
    ).resolves.toBe("not_found");
  });

  it("answers not found for a malformed id without asking the database", async () => {
    const alerts = fakeAlerts();
    await expect(
      markAlertHandled({ schoolId: "school-a", alertId: "x".repeat(65), role: "principal" }, { alerts }),
    ).resolves.toBe("not_found");
    expect(alerts.acknowledge).not.toHaveBeenCalled();
  });
});
