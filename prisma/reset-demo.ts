import "dotenv/config";
import { prisma } from "@/lib/db";
import { insertDemoData, printDemoDataSummary } from "./demo-data";

/**
 * Empties every table and puts the demo data back, so the browser tests
 * always start from the same known state. Refuses to touch anything but a
 * database on this machine: a reset must never reach a real school's data.
 */
async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
    throw new Error("Refusing to reset: DATABASE_URL isn't a database on localhost.");
  }

  // Every table links back to School or Parent, so CASCADE empties them all.
  // A parent belongs to no school since Step 53, so "School" alone left every
  // parent behind, with its old password (Step 55.6, P-036).
  await prisma.$executeRaw`TRUNCATE "School", "Parent" CASCADE`;
  await insertDemoData(prisma);

  console.log("Reset the demo data.");
  await printDemoDataSummary(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
