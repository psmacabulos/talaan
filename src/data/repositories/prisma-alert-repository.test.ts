import { describe, expect, it } from "vitest";
import type { Alert as AlertRow } from "@/generated/prisma/client";
import { toAlert, toAlertData } from "./prisma-alert-repository";

const row: AlertRow = {
  id: "alert-a",
  schoolId: "school-a",
  tapId: "00000000-0000-4000-8000-000000000008",
  type: "lost_card_tapped",
  createdAt: new Date("2026-06-20T08:05:00Z"),
  acknowledged: false,
};

describe("toAlert", () => {
  it("turns a database row into the app's Alert", () => {
    expect(toAlert(row)).toEqual({
      id: "alert-a",
      schoolId: "school-a",
      tapId: "00000000-0000-4000-8000-000000000008",
      type: "lost_card_tapped",
      createdAt: "2026-06-20T08:05:00.000Z",
      acknowledged: false,
    });
  });
});

describe("toAlertData", () => {
  it("round-trips: an alert saved and read back is the same alert", () => {
    const alert = toAlert(row);
    expect(toAlert({ ...row, ...toAlertData(alert) })).toEqual(alert);
  });
});
