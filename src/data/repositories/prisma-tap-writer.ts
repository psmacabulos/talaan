import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toAlertData } from "./prisma-alert-repository";
import { toNotificationData } from "./prisma-notification-repository";
import { toTapData } from "./prisma-tap-repository";
import type { TapWrite, TapWriter } from "./tap-writer";

/** Prisma's error code for "a unique value (here, the tap's id) is already taken". */
const UNIQUE_CONSTRAINT_FAILED = "P2002";

/** Thrown inside the transaction to end it without writing anything. */
class TapExists extends Error {}
class TapDuplicate extends Error {}

type Tx = Prisma.TransactionClient;

/** The lock's name for one card at one school: only reads of the same card wait for each other. */
export function tapCardLockKey(schoolId: string, cardSerial: string): string {
  return `tap-card|${schoolId}|${cardSerial}`;
}

/**
 * Step 56: the card's check and the write become one step. The lock is on
 * a number made from the school and the card, so only reads of the same
 * card wait for each other, and Postgres frees it when the transaction
 * ends. It's taken first, before any row is touched, so every tap's
 * transaction takes its locks in the same order.
 *
 * After waiting, the reads below see the other request's committed tap
 * because each statement gets a fresh view under Postgres's default
 * isolation (Read Committed). Don't change this transaction's
 * `isolationLevel`.
 */
async function checkCardUnderLock(tx: Tx, write: TapWrite): Promise<void> {
  const { tap, duplicateWindow } = write;
  if (!duplicateWindow || tap.cardSerial === null) return;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tapCardLockKey(tap.schoolId, tap.cardSerial)}, 0))`;
  // A resend of this very tap is answered as before, not as "already tapped".
  if (await tx.tap.findUnique({ where: { id: tap.id }, select: { id: true } })) throw new TapExists();
  const earlier = await tx.tap.findFirst({
    where: {
      schoolId: tap.schoolId,
      cardSerial: tap.cardSerial,
      tappedAt: { gt: new Date(duplicateWindow.from), lt: new Date(duplicateWindow.to) },
    },
    select: { id: true },
  });
  if (earlier) throw new TapDuplicate();
}

export function createPrismaTapWriter(db: PrismaClient = prisma): TapWriter {
  return {
    async record(write) {
      const { tap, alert, notification, deviceId, seenAt } = write;
      try {
        // One transaction: if any of these fails, none of them is kept, so
        // a tap is never stored without the alert or notification it owes.
        await db.$transaction(async (tx) => {
          await checkCardUnderLock(tx, write);
          await tx.tap.create({ data: { id: tap.id, ...toTapData(tap) } });
          if (alert) await tx.alert.create({ data: { id: alert.id, ...toAlertData(alert) } });
          if (notification) {
            await tx.notification.create({ data: { id: notification.id, ...toNotificationData(notification) } });
          }
          if (deviceId) await tx.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date(seenAt) } });
        });
        return "created";
      } catch (error) {
        if (error instanceof TapExists) return "exists";
        if (error instanceof TapDuplicate) return "duplicate";
        // With no window there's no lock: a taken id here means the tap
        // itself arrived twice at once, and the other one won.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_FAILED) {
          return "exists";
        }
        throw error;
      }
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const tapWriter = createPrismaTapWriter();
