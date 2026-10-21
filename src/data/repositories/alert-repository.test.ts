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
});
