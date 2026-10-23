import "dotenv/config";
import { prisma } from "@/lib/db";

/**
 * Prints, as JSON, how many of these tap ids are stored, and how many
 * parent notifications those taps made (Step 58's offline test): a
 * notification carries its student and tap time, not the tap's id. For
 * e2e/gate.spec.ts, which can't load the Prisma Client itself (see
 * push-delivery.ts). Run against the test database only:
 * `npx tsx e2e/tap-rows.ts <tap id> [<tap id> …]`.
 */
async function main() {
  const ids = process.argv.slice(2);
  const taps = await prisma.tap.findMany({ where: { id: { in: ids } }, select: { studentId: true, tappedAt: true } });
  const notifications = await prisma.notification.count({
    where: {
      OR: taps.flatMap((tap) => (tap.studentId ? [{ studentId: tap.studentId, tappedAt: tap.tappedAt }] : [])),
    },
  });
  console.log(JSON.stringify({ taps: taps.length, notifications: taps.length === 0 ? 0 : notifications }));
}

main().finally(() => prisma.$disconnect());
