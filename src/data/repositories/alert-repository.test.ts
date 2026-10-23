import { describe, expect, it } from "vitest";
import type { Alert, Tap } from "@/features/attendance/types";
import { createMockAlertRepository } from "./alert-repository";

const tapA: Tap = {
  id: "00000000-0000-4000-8000-000000000003",
  schoolId: "school-a",
  stationId: "station-a",
  cardSerial: "04:A3:5F:2B:91:C0:80",
  studentId: null,
  tappedAt: "2026-06-20T08:10:00Z",
  source: "card",
  recordedById: null,
};
const tapA2: Tap = { ...tapA, id: "00000000-0000-4000-8000-000000000004", tappedAt: "2026-06-21T08:10:00Z" };

const alertA: Alert = {
  id: "alert-a",
  schoolId: "school-a",
  tapId: tapA.id,
  studentId: "student-a",
  type: "lost_card_tapped",
  createdAt: "2026-06-20T08:10:00Z",
  acknowledged: false,
};
const alertA2: Alert = { ...alertA, id: "alert-a2", tapId: tapA2.id, createdAt: "2026-06-21T08:10:00Z" };
const alertB: Alert = { ...alertA, id: "alert-b", schoolId: "school-b" };

const options = { latencyMs: 0 };

describe("createMockAlertRepository", () => {
  it("lists a school's open alerts newest first, with their taps, and counts them all", async () => {
    const repo = createMockAlertRepository([alertA, alertA2, alertB], [tapA, tapA2], options);
    await expect(repo.listOpen("school-a", 1)).resolves.toEqual({ alerts: [{ ...alertA2, tap: tapA2 }], total: 2 });
  });

  it("leaves out handled alerts", async () => {
    const repo = createMockAlertRepository([alertA, { ...alertA2, acknowledged: true }], [tapA, tapA2], options);
    await expect(repo.listOpen("school-a", 10)).resolves.toEqual({ alerts: [{ ...alertA, tap: tapA }], total: 1 });
  });

  it("finds the alerts of given taps, in one school only", async () => {
    const repo = createMockAlertRepository([alertA, alertA2, alertB], [tapA, tapA2], options);
    await expect(repo.listForTaps("school-a", [tapA.id])).resolves.toEqual([alertA]);
    await expect(repo.listForTaps("school-b", [tapA2.id])).resolves.toEqual([]);
  });

  it("marks an alert handled, but never another school's", async () => {
    const repo = createMockAlertRepository([alertA, alertB], [tapA], options);
    await expect(repo.acknowledge("school-b", "alert-a")).resolves.toBe(false);
    await expect(repo.acknowledge("school-a", "alert-a")).resolves.toBe(true);
    await expect(repo.listOpen("school-a", 10)).resolves.toEqual({ alerts: [], total: 0 });
  });
});
