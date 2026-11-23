import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_RETENTION_MS, cleanDetails, recordAudit, resetAuditCleanUp } from "./record-audit";

const event = {
  schoolId: "school-a",
  actor: { id: "staff-1", role: "principal" as const },
  action: "student_updated" as const,
  targetType: "student" as const,
  targetId: "student-1",
};

function deps(overrides: { record?: () => Promise<void>; deleteOlderThan?: () => Promise<number> } = {}) {
  return {
    audit: {
      record: vi.fn(overrides.record ?? (async () => {})),
      deleteOlderThan: vi.fn(overrides.deleteOlderThan ?? (async () => 0)),
    },
    now: vi.fn(() => Date.parse("2026-06-19T01:00:00Z")),
  };
}

describe("cleanDetails (Step 60.1)", () => {
  it("keeps only the field names on the list, once each", () => {
    expect(cleanDetails({ fields: ["lastName", "lastName", "section", "Juan Dela Cruz", "09171234567"] })).toEqual({
      fields: ["lastName", "section"],
    });
  });

  it("answers nothing when no field is left", () => {
    expect(cleanDetails({ fields: ["Juan"] })).toBeUndefined();
    expect(cleanDetails(undefined)).toBeUndefined();
  });
});

describe("recordAudit (Step 60.1)", () => {
  beforeEach(() => resetAuditCleanUp());

  it("stores the event with its details cleaned", async () => {
    const d = deps();
    await recordAudit({ ...event, details: { fields: ["section", "Maria"] } }, d);
    expect(d.audit.record).toHaveBeenCalledWith({ ...event, details: { fields: ["section"] } });
  });

  it("never throws when the write fails, and says nothing about who", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({
      record: async () => {
        throw new Error("Juan Dela Cruz");
      },
    });
    await expect(recordAudit(event, d)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("audit: an event could not be written");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Juan");
    expect(d.audit.deleteOlderThan).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("deletes events older than two years at most once an hour", async () => {
    const d = deps();
    await recordAudit(event, d);
    await recordAudit(event, d);
    expect(d.audit.deleteOlderThan).toHaveBeenCalledTimes(1);
    expect(d.audit.deleteOlderThan).toHaveBeenCalledWith(
      new Date(Date.parse("2026-06-19T01:00:00Z") - AUDIT_RETENTION_MS).toISOString(),
      1000,
    );

    d.now.mockReturnValue(Date.parse("2026-06-19T02:00:01Z"));
    await recordAudit(event, d);
    expect(d.audit.deleteOlderThan).toHaveBeenCalledTimes(2);
  });

  it("keeps the event even when the cleanup fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({
      deleteOlderThan: async () => {
        throw new Error("boom");
      },
    });
    await expect(recordAudit(event, d)).resolves.toBeUndefined();
    expect(d.audit.record).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
