import "dotenv/config";
import { prisma } from "@/lib/db";
import { insertDemoData, printDemoDataSummary } from "./demo-data";

async function main() {
  await insertDemoData(prisma);
  await printDemoDataSummary(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
