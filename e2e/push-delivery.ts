import "dotenv/config";
import { prisma } from "@/lib/db";

/**
 * Prints what the push worker did with one notification for one phone
 * (Step 54), as JSON: `{ status, ticketId }`, or `null` before the worker
 * got to it. For e2e/parent-api.spec.ts, which can't load the Prisma Client
 * itself (Playwright's loader can't run its `import.meta`), the same way
 * global-setup.ts runs create-test-devices.ts. Run against the test
 * database only: `npx tsx e2e/push-delivery.ts <notificationId> <push token>`.
 */
async function main() {
  const [notificationId, token] = process.argv.slice(2);
  const delivery = await prisma.pushDelivery.findFirst({
    where: { notificationId, pushToken: { token } },
    select: { status: true, ticketId: true },
  });
  console.log(JSON.stringify(delivery));
}

main().finally(() => prisma.$disconnect());
