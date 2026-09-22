import { describe, expect, it } from "vitest";
import type { Alert } from "@/features/attendance/types";
import { createMockAlertRepository } from "./alert-repository";

const alertA: Alert = {
  id: "alert-a",
  schoolId: "school-a",
  tapId: "00000000-0000-4000-8000-000000000003",
  type: "lost_card_tapped",
  createdAt: "2026-06-20T08:10:00Z",
  acknowledged: false,
};

const alertB: Alert = { ...alertA, id: "alert-b", schoolId: "school-b" };

describe("createMockAlertRepository", () => {
  it("lists only a given school's alerts", async () => {
    const repo = createMockAlertRepository([alertA, alertB], { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([alertA]);
  });

  it("returns an empty list for a school with no alerts", async () => {
    const repo = createMockAlertRepository([alertA], { latencyMs: 0 });
    await expect(repo.listBySchool("school-none")).resolves.toEqual([]);
  });

  it("creates a new alert", async () => {
    const repo = createMockAlertRepository([alertA], { latencyMs: 0 });
    const created: Alert = { ...alertB, id: "alert-new" };
    await expect(repo.create(created)).resolves.toEqual(created);
    await expect(repo.listBySchool("school-b")).resolves.toEqual([created]);
  });

  it("does not create a duplicate for an id that already exists", async () => {
    const repo = createMockAlertRepository([alertA], { latencyMs: 0 });
    await repo.create({ ...alertA, acknowledged: true });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([alertA]);
  });
});
