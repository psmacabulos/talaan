// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import { createPrismaAuditRepository } from "./prisma-audit-repository";

/**
 * The Activity log against real Postgres (Step 60.1): a school sees only its
 * own events, newest first, in pages that don't skip or repeat a row even
 * when events share a time; the filter and the retention delete work. Its
 * events carry the actor id "audit-test-actor" and are removed afterwards.
 * Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const ACTOR = "audit-test-actor";
const BALANGA = "school-balanga";
const OCEANVIEW = "school-oceanview";
const actor = { id: ACTOR, role: "principal" as const };

describeWithDatabase("the audit log on Postgres (Step 60.1; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const audit = createPrismaAuditRepository(db);

  const cleanUp = () => db.auditEvent.deleteMany({ where: { actorId: ACTOR } });
  const mine = async (schoolId: string, options: Parameters<typeof audit.listPage>[1]) =>
    (await audit.listPage(schoolId, options)).filter((event) => event.actorId === ACTOR);

  beforeAll(async () => {
    await cleanUp();
    const at = (iso: string) => new Date(iso);
    const row = (id: string, iso: string, action: AuditAction) => ({ id, createdAt: at(iso), action });
    // Three events share one time, so only the id breaks the tie.
    await db.auditEvent.createMany({
      data: [
        row("00000000-0000-4000-8000-0000000000a1", "2026-06-19T01:00:00Z", "student_created"),
        row("00000000-0000-4000-8000-0000000000a2", "2026-06-19T01:00:00Z", "card_linked"),
        row("00000000-0000-4000-8000-0000000000a3", "2026-06-19T01:00:00Z", "student_updated"),
        row("00000000-0000-4000-8000-0000000000a4", "2026-06-19T02:00:00Z", "staff_invited"),
        row("00000000-0000-4000-8000-0000000000a5", "2020-01-01T00:00:00Z", "staff_removed"),
      ].map((event) => ({
        ...event,
        schoolId: BALANGA,
        actorId: ACTOR,
        actorRole: "principal" as const,
        targetType: "student" as const,
        targetId: "student-1",
      })),
    });
    await db.auditEvent.create({
      data: {
        schoolId: OCEANVIEW,
        actorId: ACTOR,
        actorRole: "principal",
        action: "student_created",
        targetType: "student",
        targetId: "student-x",
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("records an event, keeping only its details' field names", async () => {
    await audit.record({
      schoolId: BALANGA,
      actor,
      action: "student_updated",
      targetType: "student",
      targetId: "student-2",
      details: { fields: ["section"] },
    });
    const [latest] = await mine(BALANGA, { actions: ["student_updated"], before: null, limit: 1 });
    expect(latest).toMatchObject({ targetId: "student-2", details: { fields: ["section"] } });
  });

  it("lists only the school's own events, newest first", async () => {
    const balanga = await mine(BALANGA, { actions: null, before: null, limit: 50 });
    expect(balanga.every((event) => event.targetId !== "student-x")).toBe(true);
    const times = balanga.map((event) => event.createdAt);
    expect([...times].sort().reverse()).toEqual(times);

    const oceanview = await mine(OCEANVIEW, { actions: null, before: null, limit: 50 });
    expect(oceanview.map((event) => event.targetId)).toEqual(["student-x"]);
  });

  it("pages by a cursor without skipping or repeating events that share a time", async () => {
    const all = await mine(BALANGA, {
      actions: ["student_created", "card_linked", "student_updated"],
      before: null,
      limit: 50,
    });
    const firstPage = await audit.listPage(BALANGA, { actions: null, before: null, limit: 2 });
    const rest: string[] = [];
    let before = { createdAt: firstPage[1].createdAt, id: firstPage[1].id };
    for (let guard = 0; guard < 50; guard++) {
      const page = await audit.listPage(BALANGA, { actions: null, before, limit: 2 });
      rest.push(...page.map((event) => event.id));
      if (page.length < 2) break;
      before = { createdAt: page[1].createdAt, id: page[1].id };
    }
    const everyId = [...firstPage.map((event) => event.id), ...rest];
    expect(new Set(everyId).size).toBe(everyId.length);
    for (const event of all) expect(everyId).toContain(event.id);
  });

  it("filters by action", async () => {
    const cards = await mine(BALANGA, { actions: ["card_linked"], before: null, limit: 50 });
    expect(cards.map((event) => event.action)).toEqual(["card_linked"]);
  });

  it("deletes only events older than the cutoff, in batches", async () => {
    const deleted = await audit.deleteOlderThan("2021-01-01T00:00:00Z", 1000);
    expect(deleted).toBeGreaterThanOrEqual(1);
    const left = await mine(BALANGA, { actions: ["staff_removed"], before: null, limit: 10 });
    expect(left).toHaveLength(0);
    const recent = await mine(BALANGA, { actions: ["staff_invited"], before: null, limit: 10 });
    expect(recent).toHaveLength(1);
  });
});
