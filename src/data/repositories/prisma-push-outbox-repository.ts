import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { Notification } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import type { DeliveryResult, PushOutboxRepository, ReceiptDue, ReceiptResult } from "./push-outbox-repository";

/**
 * The push outbox in Postgres (Steps 54 and 54.1). Raw SQL for the claims and the cleanup:
 * `FOR UPDATE SKIP LOCKED` lets two workers (a deploy's old and new server,
 * a `heroku run`, a worker dyno later) each take different rows, never the
 * same one, and Prisma's query builder can't say it. Names are quoted
 * because Postgres folds unquoted names to lower case.
 */
export function createPrismaPushOutboxRepository(db: PrismaClient = prisma): PushOutboxRepository {
  return {
    async fanOut(limit, { maxAgeMs, signInUnusedMs }) {
      // One transaction: a notification is never marked pushed without its
      // deliveries, so a crash between the two can't lose a push.
      return db.$transaction(async (tx) => {
        const claimed = await tx.$queryRaw<{ id: string; tooOld: boolean }[]>`
          WITH due AS (
            SELECT "id" FROM "Notification"
            WHERE "pushedAt" IS NULL
            ORDER BY "createdAt"
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE "Notification" AS n SET "pushedAt" = now()
          FROM due WHERE n."id" = due."id"
          RETURNING n."id", n."createdAt" < now() - make_interval(secs => ${maxAgeMs / 1000}) AS "tooOld"`;

        const fresh = claimed.filter((notification) => !notification.tooOld).map((notification) => notification.id);
        let deliveries = 0;
        if (fresh.length > 0) {
          // Every push address of every parent linked to the child at the
          // notification's school, whose sign-in isn't revoked (Step 54) and
          // was used in the last 30 days (Step 54.1). A link notice goes to
          // its one recipient only (Step 55.2). FOR SHARE OF l: a link being
          // removed waits until these deliveries are written, so the
          // removal's cleanup finds them (Step 55.4).
          const targets = await tx.$queryRaw<{ notificationId: string; pushTokenId: string }[]>`
            SELECT n."id" AS "notificationId", p."id" AS "pushTokenId"
            FROM "Notification" AS n
            JOIN "ParentStudentLink" AS l ON l."studentId" = n."studentId" AND l."schoolId" = n."schoolId"
              AND (n."recipientParentId" IS NULL OR l."parentId" = n."recipientParentId")
            JOIN "ParentToken" AS t ON t."parentId" = l."parentId" AND t."revokedAt" IS NULL
              AND t."lastUsedAt" >= now() - make_interval(secs => ${signInUnusedMs / 1000})
            JOIN "PushToken" AS p ON p."parentTokenId" = t."id"
            WHERE n."id" IN (${Prisma.join(fresh)})
            FOR SHARE OF l`;
          const made = await tx.pushDelivery.createMany({
            data: targets.map(({ notificationId, pushTokenId }) => ({ notificationId, pushTokenId })),
            skipDuplicates: true,
          });
          deliveries = made.count;
        }
        return { notifications: claimed.length, tooOld: claimed.length - fresh.length, deliveries };
      });
    },

    async claimDue(limit, claimMs) {
      const rows = await db.$queryRaw<
        {
          id: string;
          pushTokenId: string;
          token: string;
          tries: number;
          notificationId: string;
          studentId: string;
          childFirstName: string;
          kind: Notification["kind"];
          tappedAt: Date;
          ageMs: number;
        }[]
      >`
        WITH due AS (
          SELECT "id" FROM "PushDelivery"
          WHERE ("status" = 'waiting' AND "nextAttemptAt" <= now())
             OR ("status" = 'sending' AND "claimedUntil" < now())
          ORDER BY "nextAttemptAt"
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        ), claimed AS (
          UPDATE "PushDelivery" AS d
          SET "status" = 'sending', "claimedUntil" = now() + make_interval(secs => ${claimMs / 1000})
          FROM due WHERE d."id" = due."id"
          RETURNING d."id", d."pushTokenId", d."tries", d."notificationId"
        )
        SELECT c."id", c."pushTokenId", p."token", c."tries", n."id" AS "notificationId", n."studentId",
               s."firstName" AS "childFirstName", n."kind"::text AS "kind", n."tappedAt",
               (EXTRACT(EPOCH FROM now() - n."createdAt") * 1000)::float8 AS "ageMs"
        FROM claimed AS c
        JOIN "PushToken" AS p ON p."id" = c."pushTokenId"
        JOIN "Notification" AS n ON n."id" = c."notificationId"
        JOIN "Student" AS s ON s."id" = n."studentId"`;
      return rows.map((row) => ({ ...row, tappedAt: row.tappedAt.toISOString() }));
    },

    async saveResults(results) {
      if (results.length === 0) return;
      await db.$transaction(results.map((result) => saveResult(db, result)));
    },

    async receiptsDue(limit) {
      return db.$queryRaw<ReceiptDue[]>`
        SELECT d."id", d."ticketId", d."pushTokenId",
               (EXTRACT(EPOCH FROM now() - d."sentAt") * 1000)::float8 AS "sentAgeMs",
               (EXTRACT(EPOCH FROM now() - n."createdAt") * 1000)::float8 AS "notificationAgeMs"
        FROM "PushDelivery" AS d
        JOIN "Notification" AS n ON n."id" = d."notificationId"
        WHERE d."receiptDueAt" <= now() AND d."ticketId" IS NOT NULL
        ORDER BY d."receiptDueAt"
        LIMIT ${limit}`;
    },

    async saveReceipts(results, askAgainInMs) {
      const statements = receiptStatements(db, results, askAgainInMs);
      if (statements.length > 0) await db.$transaction(statements);
    },

    async cleanUp({ failedKeepMs, signInUnusedMs, batch, maxBatches }) {
      // Batches with SKIP LOCKED, so a big delete never holds many rows at
      // once, and a second worker running it at the same time just skips.
      let failedDeliveries = 0;
      for (let round = 0; round < maxBatches; round++) {
        const deleted = await db.$executeRaw`
          DELETE FROM "PushDelivery" WHERE "id" IN (
            SELECT "id" FROM "PushDelivery"
            WHERE "status" = 'failed' AND "nextAttemptAt" < now() - make_interval(secs => ${failedKeepMs / 1000})
            LIMIT ${batch}
            FOR UPDATE SKIP LOCKED
          )`;
        failedDeliveries += deleted;
        if (deleted < batch) break;
      }
      let signIns = 0;
      for (let round = 0; round < maxBatches; round++) {
        // The cascade takes each sign-in's push address and its deliveries.
        const deleted = await db.$executeRaw`
          DELETE FROM "ParentToken" WHERE "id" IN (
            SELECT "id" FROM "ParentToken"
            WHERE "revokedAt" IS NOT NULL OR "lastUsedAt" < now() - make_interval(secs => ${signInUnusedMs / 1000})
            LIMIT ${batch}
            FOR UPDATE SKIP LOCKED
          )`;
        signIns += deleted;
        if (deleted < batch) break;
      }
      return { failedDeliveries, signIns };
    },
  };
}

/**
 * One statement per kind of receipt outcome, not one per row (Step 54.1).
 * Each touches only rows still sent and waiting for a receipt, so repeating
 * one, or a second worker writing the same rows, changes nothing more.
 */
function receiptStatements(db: PrismaClient, results: ReceiptResult[], askAgainInMs: number) {
  const idsOf = (outcome: ReceiptResult["outcome"]) =>
    results.filter((result) => result.outcome === outcome).map((result) => result.id);
  const waitingForReceipt = Prisma.sql`"status" = 'sent' AND "receiptDueAt" IS NOT NULL`;
  const statements: Prisma.PrismaPromise<unknown>[] = [];

  const delivered = idsOf("delivered");
  if (delivered.length > 0) {
    statements.push(db.$executeRaw`
      DELETE FROM "PushDelivery" WHERE "id" IN (${Prisma.join(delivered)}) AND ${waitingForReceipt}`);
  }
  const notReady = idsOf("not_ready");
  if (notReady.length > 0) {
    statements.push(db.$executeRaw`
      UPDATE "PushDelivery" SET "receiptDueAt" = now() + make_interval(secs => ${askAgainInMs / 1000})
      WHERE "id" IN (${Prisma.join(notReady)}) AND ${waitingForReceipt}`);
  }
  const resend = idsOf("resend");
  if (resend.length > 0) {
    statements.push(db.$executeRaw`
      UPDATE "PushDelivery"
      SET "status" = 'waiting', "receiptDueAt" = NULL, "ticketId" = NULL, "nextAttemptAt" = now(),
          "lastError" = 'MessageRateExceeded'
      WHERE "id" IN (${Prisma.join(resend)}) AND ${waitingForReceipt}`);
  }
  // Failed rows grouped by error, so each group is one statement.
  const failedByError = new Map<string, string[]>();
  for (const result of results) {
    if (result.outcome !== "failed") continue;
    failedByError.set(result.error, [...(failedByError.get(result.error) ?? []), result.id]);
  }
  for (const [error, ids] of failedByError) {
    statements.push(db.$executeRaw`
      UPDATE "PushDelivery" SET "status" = 'failed', "receiptDueAt" = NULL, "lastError" = ${error}
      WHERE "id" IN (${Prisma.join(ids)}) AND ${waitingForReceipt}`);
  }
  const gone = [...new Set(results.flatMap((result) => (result.outcome === "gone" ? [result.pushTokenId] : [])))];
  if (gone.length > 0) statements.push(db.pushToken.deleteMany({ where: { id: { in: gone } } }));
  return statements;
}

/** One result as one statement, for `saveResults`'s single transaction. */
function saveResult(db: PrismaClient, result: DeliveryResult) {
  switch (result.outcome) {
    case "sent":
      return db.$executeRaw`
        UPDATE "PushDelivery"
        SET "status" = 'sent', "ticketId" = ${result.ticketId}, "sentAt" = now(), "claimedUntil" = NULL, "lastError" = NULL,
            "receiptDueAt" = now() + make_interval(secs => ${result.receiptInMs / 1000})
        WHERE "id" = ${result.id} AND "status" = 'sending'`;
    case "retry":
      return db.$executeRaw`
        UPDATE "PushDelivery"
        SET "status" = 'waiting', "tries" = "tries" + ${result.countsAsTry ? 1 : 0},
            "nextAttemptAt" = now() + make_interval(secs => ${result.retryInMs / 1000}),
            "claimedUntil" = NULL, "lastError" = ${result.error}
        WHERE "id" = ${result.id} AND "status" = 'sending'`;
    case "failed":
      return db.$executeRaw`
        UPDATE "PushDelivery"
        SET "status" = 'failed', "tries" = "tries" + 1, "claimedUntil" = NULL, "lastError" = ${result.error}
        WHERE "id" = ${result.id} AND "status" = 'sending'`;
    case "gone":
      // The cascade removes this phone's other deliveries too.
      return db.pushToken.deleteMany({ where: { id: result.pushTokenId } });
  }
}

/** The one instance the rest of the app actually imports. */
export const pushOutboxRepository = createPrismaPushOutboxRepository();
