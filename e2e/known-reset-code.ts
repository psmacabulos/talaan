import "dotenv/config";
import { prisma } from "@/lib/db";
import { hashResetCode } from "@/services/parents/reset-code";
import { TEST_SESSION_SECRET } from "./sessions";

/**
 * Stores a reset code the test knows for one parent (Step 55.6), hashed
 * with the test server's secret exactly as the server would, since a test
 * can't read the emailed one. For e2e/parent-api.spec.ts, the same way as
 * push-delivery.ts. Run against the test database only:
 * `npx tsx e2e/known-reset-code.ts <parent email> <6 digits>`.
 */
async function main() {
  const [email, code] = process.argv.slice(2);
  const parent = await prisma.parent.findUniqueOrThrow({ where: { email } });
  const id = crypto.randomUUID();
  await prisma.parentPasswordReset.create({
    data: {
      id,
      parentId: parent.id,
      codeHash: hashResetCode(id, code, TEST_SESSION_SECRET),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
}

main().finally(() => prisma.$disconnect());
