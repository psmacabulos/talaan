import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toAlertData } from "./prisma-alert-repository";
import { toNotificationData } from "./prisma-notification-repository";
import { toTapData } from "./prisma-tap-repository";
import type { TapWriter } from "./tap-writer";

/** Prisma's error code for "a unique value (here, the tap's id) is already taken". */
const UNIQUE_CONSTRAINT_FAILED = "P2002";

export function createPrismaTapWriter(db: PrismaClient = prisma): TapWriter {
  return {
    async record({ tap, alert, notification, deviceId, seenAt }) {
      try {
        // One transaction: if any of these fails, none of them is kept, so
        // a tap is never stored without the alert or notification it owes.
        await db.$transaction(async (tx) => {
          await tx.tap.create({ data: { id: tap.id, ...toTapData(tap) } });
          if (alert) await tx.alert.create({ data: { id: alert.id, ...toAlertData(alert) } });
          if (notification) {
            await tx.notification.create({ data: { id: notification.id, ...toNotificationData(notification) } });
          }
          await tx.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date(seenAt) } });
        });
        return "created";
      } catch (error) {
        // The tap comes first, so a taken id here means the tap itself:
        // the same tap arrived twice at once, and the other one won.
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
