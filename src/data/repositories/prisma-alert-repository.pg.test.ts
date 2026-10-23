// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaAlertRepository } from "./prisma-alert-repository";

/**
 * Step 57's alert queries against real Postgres: open alerts newest first
 * with their taps, counted in all; a few taps' alerts; and marking one
 * handled, each kept inside its school. Lost-card taps (no student, as Step
 * 57 stores them) on a date far ahead, removed afterwards. The demo's own
 * alerts are older, so they never come first. Skipped, not failed, when
 * E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const BALANGA = "school-balanga";
const OCEANVIEW = "school-oceanview";
const OWNER = "student-0013";
const at = (minute: number) => new Date(Date.UTC(2031, 3, 7, 0, minute)).toISOString();

describeWithDatabase("alerts on Postgres (Step 57; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const alerts = createPrismaAlertRepository(db);
  const ids = {
    older: crypto.randomUUID(),
    newer: crypto.randomUUID(),
    handled: crypto.randomUUID(),
    otherSchool: crypto.randomUUID(),
  };
  const rows = [
    { key: "older", schoolId: BALANGA, minute: 1, acknowledged: false },
    { key: "newer", schoolId: BALANGA, minute: 2, acknowledged: false },
    { key: "handled", schoolId: BALANGA, minute: 3, acknowledged: true },
    { key: "otherSchool", schoolId: OCEANVIEW, minute: 4, acknowledged: false },
  ] as const;
  const tapIds = {
    older: crypto.randomUUID(),
    newer: crypto.randomUUID(),
    handled: crypto.randomUUID(),
    otherSchool: crypto.randomUUID(),
  };
  const tapIdOf = (key: keyof typeof ids) => tapIds[key];

  async function cleanUp() {
    await db.alert.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await db.tap.deleteMany({ where: { id: { in: Object.values(tapIds) } } });
  }

  beforeAll(async () => {
    await cleanUp();
    for (const row of rows) {
      await db.tap.create({
        data: {
          id: tapIdOf(row.key),
          schoolId: row.schoolId,
          stationId: "gate-alert-test",
          cardSerial: `04:00:00:00:00:00:0${row.minute}`,
          studentId: null,
          tappedAt: new Date(at(row.minute)),
        },
      });
      await db.alert.create({
        data: {
          id: ids[row.key],
          schoolId: row.schoolId,
          tapId: tapIdOf(row.key),
          studentId: row.schoolId === BALANGA ? OWNER : null,
          type: "lost_card_tapped",
          createdAt: new Date(at(row.minute)),
          acknowledged: row.acknowledged,
        },
      });
    }
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("lists open alerts newest first, with their taps, and counts every open one", async () => {
    const { alerts: firstTwo, total } = await alerts.listOpen(BALANGA, 2);
    expect(firstTwo.map((alert) => alert.id)).toEqual([ids.newer, ids.older]);
    expect(firstTwo[0]).toMatchObject({ studentId: OWNER, tap: { id: tapIdOf("newer"), studentId: null } });
    expect(total).toBeGreaterThanOrEqual(2);

    const all = await alerts.listOpen(BALANGA, 100);
    const shown = all.alerts.map((alert) => alert.id);
    expect(shown).not.toContain(ids.handled);
    expect(shown).not.toContain(ids.otherSchool);
    expect(all.total).toBe(total);
  });

  it("finds a few taps' alerts, handled or not, in one school only", async () => {
    const found = await alerts.listForTaps(BALANGA, [tapIdOf("newer"), tapIdOf("handled"), tapIdOf("otherSchool")]);
    expect(found.map((alert) => alert.id).sort()).toEqual([ids.newer, ids.handled].sort());
    await expect(alerts.listForTaps(BALANGA, [])).resolves.toEqual([]);
  });

  it("marks an alert handled once per school, and never another school's", async () => {
    await expect(alerts.acknowledge(BALANGA, ids.otherSchool)).resolves.toBe(false);
    await expect(alerts.acknowledge(BALANGA, ids.older)).resolves.toBe(true);
    // Already handled by someone else: still done.
    await expect(alerts.acknowledge(BALANGA, ids.older)).resolves.toBe(true);

    const open = await alerts.listOpen(BALANGA, 100);
    expect(open.alerts.map((alert) => alert.id)).not.toContain(ids.older);
    await expect(db.alert.findUnique({ where: { id: ids.otherSchool } })).resolves.toMatchObject({
      acknowledged: false,
    });
  });
});
