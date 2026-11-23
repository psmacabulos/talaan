// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isForeignKeyViolation, isRetryable } from "./prisma-errors";
import { createPrismaStudentDataRepository } from "./prisma-student-data-repository";
import { createPrismaTapWriter } from "./prisma-tap-writer";

/**
 * Step 60.3's export and delete against real Postgres: the foreign keys,
 * the order of the deletes, and the races are all database behaviour. Its
 * students are its own (ids starting "sdt-"), two at Balanga and one at
 * Oceanview, with a card, taps, a lost card's tap and alert, a notice, a
 * parent link and a block each; all removed afterwards, as are the audit
 * rows it makes. Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const BALANGA = "school-balanga";
const OCEANVIEW = "school-oceanview";
const VICTIM = "sdt-victim";
const NEIGHBOUR = "sdt-neighbour";
const ABROAD = "sdt-abroad";
const STUDENTS = [VICTIM, NEIGHBOUR, ABROAD];
const PARENT = "sdt-parent";
const ACTOR = { id: "sdt-actor", role: "principal" as const };
const WAIT = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeWithDatabase("one student's data on Postgres (Step 60.3; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const data = createPrismaStudentDataRepository(db);

  async function cleanUp() {
    await db.auditEvent.deleteMany({ where: { targetId: { in: STUDENTS } } });
    await db.notification.deleteMany({ where: { studentId: { in: STUDENTS } } });
    await db.alert.deleteMany({ where: { studentId: { in: STUDENTS } } });
    await db.tap.deleteMany({ where: { OR: [{ studentId: { in: STUDENTS } }, { stationId: "sdt-gate" }] } });
    await db.linkBlock.deleteMany({ where: { studentId: { in: STUDENTS } } });
    await db.parentStudentLink.deleteMany({ where: { studentId: { in: STUDENTS } } });
    await db.card.deleteMany({ where: { studentId: { in: STUDENTS } } });
    await db.student.deleteMany({ where: { id: { in: STUDENTS } } });
    await db.parent.deleteMany({ where: { id: PARENT } });
  }

  async function seed() {
    await db.parent.create({
      data: {
        id: PARENT,
        firstName: "Maria",
        lastName: "Sdt",
        mobile: "09170000000",
        email: "sdt-parent@example.com",
        passwordHash: "x",
      },
    });
    for (const [id, schoolId] of [
      [VICTIM, BALANGA],
      [NEIGHBOUR, BALANGA],
      [ABROAD, OCEANVIEW],
    ] as const) {
      await db.student.create({
        data: {
          id,
          schoolId,
          firstName: id,
          lastName: "Sdt",
          birthDate: new Date("2012-03-04"),
          gradeLevel: 7,
          section: "A",
          guardianName: "Guardian",
          guardianMobile: "09171234567",
          photoKey: `${schoolId}/${id}/photo.webp`,
        },
      });
      // An active card, and (for the victim) a lost one that a later tap used.
      await db.card.create({
        data: { id: `${id}-card`, schoolId, studentId: id, serial: `${id}:01`, status: "active" },
      });
      await db.tap.create({
        data: {
          id: `${id}-tap`,
          schoolId,
          stationId: "sdt-gate",
          cardSerial: `${id}:01`,
          studentId: id,
          tappedAt: new Date("2026-06-19T00:00:00Z"),
        },
      });
      await db.notification.create({
        data: {
          id: `${id}-notice`,
          schoolId,
          studentId: id,
          kind: "time_in",
          tappedAt: new Date("2026-06-19T00:00:00Z"),
        },
      });
      await db.parentStudentLink.create({ data: { id: `${id}-link`, schoolId, parentId: PARENT, studentId: id } });
    }
    await db.linkBlock.create({ data: { schoolId: BALANGA, parentId: PARENT, studentId: VICTIM } });
    // The victim's lost card, and a tap of it after it was lost: no student on the tap, only the serial.
    await db.card.create({
      data: { id: "sdt-lost", schoolId: BALANGA, studentId: VICTIM, serial: `${VICTIM}:LOST`, status: "lost" },
    });
    await db.tap.create({
      data: {
        id: "sdt-lost-tap",
        schoolId: BALANGA,
        stationId: "sdt-gate",
        cardSerial: `${VICTIM}:LOST`,
        studentId: null,
        tappedAt: new Date("2026-06-19T01:00:00Z"),
      },
    });
    await db.alert.create({
      // Handled, so the alerts test's count of Balanga's open alerts, running at the same time, isn't changed.
      data: {
        id: "sdt-alert",
        schoolId: BALANGA,
        tapId: "sdt-lost-tap",
        studentId: VICTIM,
        type: "lost_card_tapped",
        acknowledged: true,
      },
    });
  }

  beforeAll(cleanUp);
  beforeEach(async () => {
    await cleanUp();
    await seed();
  });
  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("exports the student's own data, with their lost card's tap, and none of anyone else's", async () => {
    const result = await data.exportOf(BALANGA, VICTIM);

    expect(result?.student.id).toBe(VICTIM);
    expect(result?.cards.map((card) => card.serial).sort()).toEqual([`${VICTIM}:01`, `${VICTIM}:LOST`]);
    expect(result?.taps).toHaveLength(2);
    expect(result?.taps.filter((tap) => tap.lostCard)).toHaveLength(1);
    expect(result?.alerts).toHaveLength(1);
    expect(result?.notices).toHaveLength(1);
    expect(result?.linkedParents).toEqual([expect.objectContaining({ firstName: "Maria" })]);
    const text = JSON.stringify(result);
    expect(text).not.toContain(NEIGHBOUR);
    expect(text).not.toContain("sdt-parent@example.com");
    expect(text).not.toContain("09170000000");
    expect(text).not.toContain("sdt-gate");
  });

  it("answers none for another school's student, and for one that doesn't exist", async () => {
    await expect(data.exportOf(OCEANVIEW, VICTIM)).resolves.toBeNull();
    await expect(data.exportOf(BALANGA, "sdt-nobody")).resolves.toBeNull();
    await expect(data.deleteAll(OCEANVIEW, VICTIM, ACTOR)).resolves.toBeNull();
    await expect(db.student.count({ where: { id: VICTIM } })).resolves.toBe(1);
  });

  it("deletes the student and everything of theirs, and leaves everyone else's alone", async () => {
    await expect(data.deleteAll(BALANGA, VICTIM, ACTOR)).resolves.toEqual({
      photoKey: `${BALANGA}/${VICTIM}/photo.webp`,
    });

    await expect(db.student.count({ where: { id: VICTIM } })).resolves.toBe(0);
    await expect(db.card.count({ where: { studentId: VICTIM } })).resolves.toBe(0);
    await expect(db.tap.count({ where: { OR: [{ studentId: VICTIM }, { id: "sdt-lost-tap" }] } })).resolves.toBe(0);
    await expect(db.alert.count({ where: { id: "sdt-alert" } })).resolves.toBe(0);
    await expect(db.notification.count({ where: { studentId: VICTIM } })).resolves.toBe(0);
    await expect(db.parentStudentLink.count({ where: { studentId: VICTIM } })).resolves.toBe(0);
    await expect(db.linkBlock.count({ where: { studentId: VICTIM } })).resolves.toBe(0);

    // The neighbour, the other school's student, and the parent are untouched.
    for (const id of [NEIGHBOUR, ABROAD]) {
      await expect(db.student.count({ where: { id } })).resolves.toBe(1);
      await expect(db.card.count({ where: { studentId: id } })).resolves.toBe(1);
      await expect(db.tap.count({ where: { studentId: id } })).resolves.toBe(1);
      await expect(db.notification.count({ where: { studentId: id } })).resolves.toBe(1);
      await expect(db.parentStudentLink.count({ where: { studentId: id } })).resolves.toBe(1);
    }
    await expect(db.parent.count({ where: { id: PARENT } })).resolves.toBe(1);
  });

  it("records the deletion in the same transaction, naming no one", async () => {
    await data.deleteAll(BALANGA, VICTIM, ACTOR);

    const event = await db.auditEvent.findFirstOrThrow({ where: { action: "student_deleted", targetId: VICTIM } });
    expect(event).toMatchObject({ schoolId: BALANGA, actorId: "sdt-actor", actorRole: "principal", details: null });
    expect(JSON.stringify(event)).not.toContain("Sdt");
  });

  it("deletes once: a double click finds nothing the second time", async () => {
    const results = await Promise.all([data.deleteAll(BALANGA, VICTIM, ACTOR), data.deleteAll(BALANGA, VICTIM, ACTOR)]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    await expect(db.auditEvent.count({ where: { action: "student_deleted", targetId: VICTIM } })).resolves.toBe(1);
  });

  it("proves the premise of the retry: deleting a student that still has a tap fails as a foreign-key error, which is retryable", async () => {
    const failure = await db.student.delete({ where: { id: VICTIM } }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(isForeignKeyViolation(failure)).toBe(true);
    expect(isRetryable(failure)).toBe(true);
  });

  it("removes a tap saved for the student in the same instant, by running again once", async () => {
    let saved!: () => void;
    const tapSaved = new Promise<void>((resolve) => (saved = resolve));
    let commit!: () => void;
    const release = new Promise<void>((resolve) => (commit = resolve));
    // A gate's write in progress: its tap row holds a share of the student until it commits.
    const writing = db.$transaction(async (tx) => {
      await tx.tap.create({
        data: {
          id: "sdt-late-tap",
          schoolId: BALANGA,
          stationId: "sdt-gate",
          cardSerial: `${VICTIM}:01`,
          studentId: VICTIM,
          tappedAt: new Date("2026-06-19T02:00:00Z"),
        },
      });
      saved();
      await release;
    });
    await tapSaved;

    const deleting = data.deleteAll(BALANGA, VICTIM, ACTOR);
    await WAIT(300);
    commit();
    await writing;

    await expect(deleting).resolves.toEqual({ photoKey: `${BALANGA}/${VICTIM}/photo.webp` });
    await expect(db.tap.count({ where: { id: "sdt-late-tap" } })).resolves.toBe(0);
    await expect(db.student.count({ where: { id: VICTIM } })).resolves.toBe(0);
  });

  it("waits for a push fan-out in progress instead of deadlocking with it", async () => {
    let locked!: () => void;
    const fanOutHolds = new Promise<void>((resolve) => (locked = resolve));
    let commit!: () => void;
    const release = new Promise<void>((resolve) => (commit = resolve));
    // What the worker does, in its order: notification rows (FOR UPDATE SKIP LOCKED), then FOR SHARE on the links.
    const fanOut = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Notification" WHERE "studentId" = ${VICTIM} FOR UPDATE SKIP LOCKED`;
      await tx.$queryRaw`SELECT id FROM "ParentStudentLink" WHERE "studentId" = ${VICTIM} FOR SHARE`;
      locked();
      await release;
    });
    await fanOutHolds;

    let finished = false;
    const deleting = data.deleteAll(BALANGA, VICTIM, ACTOR).then((result) => {
      finished = true;
      return result;
    });
    await WAIT(400);
    expect(finished).toBe(false);

    commit();
    await fanOut;
    await expect(deleting).resolves.not.toBeNull();
    await expect(db.student.count({ where: { id: VICTIM } })).resolves.toBe(0);
  });

  it("makes the tap writer answer 'gone' when the student is deleted before the tap is saved, and keep nothing", async () => {
    await data.deleteAll(BALANGA, VICTIM, ACTOR);
    const writer = createPrismaTapWriter(db);

    const answer = await writer.record({
      tap: {
        id: crypto.randomUUID(),
        schoolId: BALANGA,
        stationId: "sdt-gate",
        cardSerial: `${VICTIM}:01`,
        studentId: VICTIM,
        tappedAt: "2026-06-19T03:00:00.000Z",
        source: "card",
      },
      alert: null,
      notification: null,
      deviceId: null,
      seenAt: "2026-06-19T03:00:00.000Z",
      duplicateWindow: null,
    });

    expect(answer).toBe("gone");
    await expect(
      db.tap.count({ where: { cardSerial: `${VICTIM}:01`, tappedAt: new Date("2026-06-19T03:00:00Z") } }),
    ).resolves.toBe(0);
  });
});
