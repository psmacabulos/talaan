import { describe, expect, it } from "vitest";
import { seedSchools, seedTaps } from "@/data/seed";
import { createMockNotificationRepository } from "@/data/repositories/notification-repository";
import { createMockSchoolRepository } from "@/data/repositories/school-repository";
import { createMockTapRepository } from "@/data/repositories/tap-repository";
import type { Tap } from "./types";
import { notifyParentsForTap, type NotifyParentsDeps } from "./notify-parents";

/**
 * Fresh repositories per test over the real seed data — the three seed
 * schools deliberately have all three `notificationPreference` values, so
 * the fan-out's whole decision table runs against real seed records.
 */
function freshDeps(): NotifyParentsDeps {
  return {
    schoolRepository: createMockSchoolRepository(seedSchools, { latencyMs: 0 }),
    tapRepository: createMockTapRepository(seedTaps, { latencyMs: 0 }),
    notificationRepository: createMockNotificationRepository([], { latencyMs: 0 }),
  };
}

function tap(studentId: string | null, schoolId: string): Tap {
  return {
    id: crypto.randomUUID(),
    schoolId,
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId,
    tappedAt: "2026-06-20T09:15:00Z",
  };
}

describe("notifyParentsForTap", () => {
  it("creates a time_in notification under a 'both' preference", async () => {
    const deps = freshDeps();
    // student-0006 (Balanga) has no tap today — its first tap is a time in.
    const created = await notifyParentsForTap(tap("student-0006", "school-balanga"), deps);
    expect(created).toMatchObject({
      schoolId: "school-balanga",
      studentId: "student-0006",
      kind: "time_in",
      tappedAt: "2026-06-20T09:15:00Z",
      read: false,
    });
  });

  it("creates a time_out notification under a 'both' preference", async () => {
    const deps = freshDeps();
    // student-0002 (Balanga) tapped at 07:57 — its second tap is a time out.
    const created = await notifyParentsForTap(tap("student-0002", "school-balanga"), deps);
    expect(created?.kind).toBe("time_out");
  });

  it("creates nothing when the school's preference is 'off'", async () => {
    const deps = freshDeps();
    // student-0057 (Crimsonridge) has no tap today, but the school has
    // notifications off entirely.
    const created = await notifyParentsForTap(tap("student-0057", "school-crimsonridge"), deps);
    expect(created).toBeNull();
    await expect(deps.notificationRepository.listBySchool("school-crimsonridge")).resolves.toEqual([]);
  });

  it("allows a time_in under 'time_in_only'", async () => {
    const deps = freshDeps();
    // student-0043 (Oceanview) has no tap today.
    const created = await notifyParentsForTap(tap("student-0043", "school-oceanview"), deps);
    expect(created?.kind).toBe("time_in");
  });

  it("suppresses a time_out under 'time_in_only'", async () => {
    const deps = freshDeps();
    // student-0038 (Oceanview) tapped at 07:43 — its second tap would be a
    // time out, which this school doesn't send.
    const created = await notifyParentsForTap(tap("student-0038", "school-oceanview"), deps);
    expect(created).toBeNull();
    await expect(deps.notificationRepository.listBySchool("school-oceanview")).resolves.toEqual([]);
  });

  it("creates nothing for an unknown-card tap (no student)", async () => {
    const deps = freshDeps();
    const created = await notifyParentsForTap(tap(null, "school-balanga"), deps);
    expect(created).toBeNull();
  });

  it("creates nothing for a school that doesn't exist", async () => {
    const deps = freshDeps();
    const created = await notifyParentsForTap(tap("student-0006", "school-nowhere"), deps);
    expect(created).toBeNull();
  });
});
