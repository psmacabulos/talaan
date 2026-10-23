// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPrismaCardRepository,
  createPrismaSchoolRepository,
  createPrismaStudentRepository,
  createPrismaTapRepository,
  createPrismaTapWriter,
  type TapRepository,
} from "@/data/repositories";
import { tapCardLockKey } from "@/data/repositories/prisma-tap-writer";
import type { TapWrite } from "@/data/repositories/tap-writer";
import { tapSchema } from "@/features/attendance/schemas";
import { PrismaClient } from "@/generated/prisma/client";
import { recordTap, type RecordTapDeps } from "./record-tap";

/**
 * Two reads of one card arriving together, against real Postgres (Step 56):
 * only the database's lock can make them one tap, so only a real database
 * shows it. A race test must force both requests into the gap between the
 * check and the write, or it passes without the fix (P-037). The first test
 * does: it holds one write open mid-way, and fails every time without the
 * lock. The others check the whole result (one tap, one "Already tapped",
 * the gate and a time in by hand, a resend, two cards) and would pass some
 * runs without the lock, so they aren't the proof. On a date far ahead,
 * with a gate row of its own, and everything removed afterwards. Skipped,
 * not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const SCHOOL = "school-balanga";
// Balanga demo students with active cards that no other database test uses.
const STUDENT_A = "student-0011";
const STUDENT_B = "student-0012";
const DAY_START = "2031-03-05T00:00:00.000Z";
const DAY_END = "2031-03-06T00:00:00.000Z";
const AT = "2031-03-05T00:30:00.000Z"; // 8:30 AM at the school
const MINUTE = 60_000;

describeWithDatabase("one read, one tap on Postgres (Step 56; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const writer = createPrismaTapWriter(db);
  const deviceId = crypto.randomUUID();
  let serialA = "";
  let serialB = "";

  const window = (at: string) => ({
    from: new Date(Date.parse(at) - 2 * MINUTE).toISOString(),
    to: new Date(Date.parse(at) + 2 * MINUTE).toISOString(),
  });

  function gateWrite(studentId: string, cardSerial: string, id = crypto.randomUUID()): TapWrite {
    return {
      tap: tapSchema.parse({ id, schoolId: SCHOOL, stationId: deviceId, cardSerial, studentId, tappedAt: AT }),
      alert: null,
      notification: null,
      deviceId,
      seenAt: AT,
      duplicateWindow: window(AT),
    };
  }

  const tapsOfDay = () =>
    db.tap.findMany({
      where: { schoolId: SCHOOL, tappedAt: { gte: new Date(DAY_START), lt: new Date(DAY_END) } },
    });

  async function cleanUp() {
    const where = {
      studentId: { in: [STUDENT_A, STUDENT_B] },
      tappedAt: { gte: new Date(DAY_START), lt: new Date(DAY_END) },
    };
    await db.notification.deleteMany({ where });
    await db.tap.deleteMany({ where });
  }

  beforeAll(async () => {
    serialA = (await db.card.findFirstOrThrow({ where: { studentId: STUDENT_A, status: "active" } })).serial;
    serialB = (await db.card.findFirstOrThrow({ where: { studentId: STUDENT_B, status: "active" } })).serial;
    await db.device.create({
      data: {
        id: deviceId,
        schoolId: SCHOOL,
        label: "Step 56 test gate",
        kind: "gate",
        tokenHash: `step-56-${deviceId}`,
      },
    });
  });

  beforeEach(cleanUp);

  afterAll(async () => {
    await cleanUp();
    await db.device.deleteMany({ where: { id: deviceId } });
    await db.$disconnect();
  });

  it("makes a read wait while another read of the card is being written, then answers duplicate", async () => {
    // Another request, halfway through its write: it holds the card's lock and
    // has inserted its tap, but hasn't committed. Without the lock, the writer
    // below wouldn't wait, wouldn't see that tap, and would store a second one.
    let inserted: () => void = () => undefined;
    let commit: () => void = () => undefined;
    const hasInserted = new Promise<void>((resolve) => (inserted = resolve));
    const mayCommit = new Promise<void>((resolve) => (commit = resolve));
    const first = gateWrite(STUDENT_A, serialA);
    const otherRequest = db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tapCardLockKey(SCHOOL, serialA)}, 0))`;
      await tx.tap.create({
        data: {
          id: first.tap.id,
          schoolId: SCHOOL,
          stationId: deviceId,
          cardSerial: serialA,
          studentId: STUDENT_A,
          tappedAt: new Date(AT),
        },
      });
      inserted();
      await mayCommit;
    });
    await hasInserted;

    try {
      let settled = false;
      const second = writer.record(gateWrite(STUDENT_A, serialA)).finally(() => (settled = true));
      // Long enough for a writer that doesn't wait to have finished.
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false);

      commit();
      await otherRequest;
      await expect(second).resolves.toBe("duplicate");
      await expect(tapsOfDay()).resolves.toHaveLength(1);
    } finally {
      // Even when a check above fails, so the held transaction never lingers.
      commit();
      await otherRequest.catch(() => undefined);
    }
  });

  it("gives two reads that both passed the quick check one tap and one Already tapped", async () => {
    // Hold both requests at the quick check until both have asked, so both hear "no tap yet".
    const taps = createPrismaTapRepository(db);
    let waiting = 0;
    let releaseBoth: () => void = () => undefined;
    const bothAsked = new Promise<void>((resolve) => (releaseBoth = resolve));
    const heldTaps: TapRepository = {
      ...taps,
      async findByCardBetween(...args) {
        const answer = await taps.findByCardBetween(...args);
        if (waiting < 2) {
          waiting += 1;
          if (waiting === 2) releaseBoth();
          await bothAsked;
        }
        return answer;
      },
    };
    const deps: RecordTapDeps = {
      cards: createPrismaCardRepository(db),
      taps: heldTaps,
      students: createPrismaStudentRepository(db),
      schools: createPrismaSchoolRepository(db),
      writer,
    };
    const read = () =>
      recordTap(
        {
          device: { id: deviceId, schoolId: SCHOOL },
          clientTapId: crypto.randomUUID(),
          rawSerial: serialA,
          clientTappedAt: AT,
          receivedAt: AT,
        },
        deps,
      );

    const results = await Promise.all([read(), read()]);
    expect(results.map((result) => result.outcome).sort()).toEqual(["duplicate", "recorded"]);
    await expect(tapsOfDay()).resolves.toHaveLength(1);
    // The school sends time in and time out, so the one tap made one notification.
    await expect(
      db.notification.count({
        where: { studentId: STUDENT_A, tappedAt: { gte: new Date(DAY_START), lt: new Date(DAY_END) } },
      }),
    ).resolves.toBe(1);
  });

  it("stores one of a gate read and a time in by hand for the same card at once", async () => {
    const manual: TapWrite = {
      ...gateWrite(STUDENT_A, serialA),
      deviceId: null,
      duplicateWindow: { from: DAY_START, to: DAY_END },
    };
    const results = await Promise.all([writer.record(gateWrite(STUDENT_A, serialA)), writer.record(manual)]);
    expect(results.sort()).toEqual(["created", "duplicate"]);
    await expect(tapsOfDay()).resolves.toHaveLength(1);
  });

  it("answers a resend of the same tap as the same tap, not as Already tapped", async () => {
    const id = crypto.randomUUID();
    const results = await Promise.all([
      writer.record(gateWrite(STUDENT_A, serialA, id)),
      writer.record(gateWrite(STUDENT_A, serialA, id)),
    ]);
    expect(results.sort()).toEqual(["created", "exists"]);
  });

  it("stores two different cards read at the same moment: the lock is per card", async () => {
    const results = await Promise.all([
      writer.record(gateWrite(STUDENT_A, serialA)),
      writer.record(gateWrite(STUDENT_B, serialB)),
    ]);
    expect(results).toEqual(["created", "created"]);
    await expect(tapsOfDay()).resolves.toHaveLength(2);
  });
});
