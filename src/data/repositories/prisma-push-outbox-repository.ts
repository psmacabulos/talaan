import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { NotificationKind } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import type { DeliveryResult, PushOutboxRepository } from "./push-outbox-repository";

/**
 * The push outbox in Postgres (Step 54). Raw SQL for the two claims:
 * `FOR UPDATE SKIP LOCKED` lets two workers (a deploy's old and new server,
 * a `heroku run`, a worker dyno later) each take different rows, never the
 * same one, and Prisma's query builder can't say it. Names are quoted
 * because Postgres folds unquoted names to lower case.
 */
export function createPrismaPushOutboxRepository(db: PrismaClient = prisma): PushOutboxRepository {
  return {
    async fanOut(limit, maxAgeMs) {
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
          // notification's school, whose sign-in isn't revoked (Step 54).
          const targets = await tx.$queryRaw<{ notificationId: string; pushTokenId: string }[]>`
            SELECT n."id" AS "notificationId", p."id" AS "pushTokenId"
            FROM "Notification" AS n
            JOIN "ParentStudentLink" AS l ON l."studentId" = n."studentId" AND l."schoolId" = n."schoolId"
            JOIN "ParentToken" AS t ON t."parentId" = l."parentId" AND t."revokedAt" IS NULL
            JOIN "PushToken" AS p ON p."parentTokenId" = t."id"
            WHERE n."id" IN (${Prisma.join(fresh)})`;
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
          kind: NotificationKind;
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
  };
}

/** One result as one statement, for `saveResults`'s single transaction. */
function saveResult(db: PrismaClient, result: DeliveryResult) {
  switch (result.outcome) {
    case "sent":
      return db.$executeRaw`
        UPDATE "PushDelivery"
        SET "status" = 'sent', "ticketId" = ${result.ticketId}, "sentAt" = now(), "claimedUntil" = NULL, "lastError" = NULL
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
