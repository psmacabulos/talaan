import "dotenv/config";
import { prisma } from "@/lib/db";
import { seedSchools } from "@/data/seed";

/**
 * Copies Phase 1's demo schools into the real database, keeping the same
 * ids ("school-balanga", ...) so the mock staff, students and taps that
 * still point at those ids keep lining up. Safe to run again: upsert
 * updates an existing row instead of failing on a duplicate id.
 */

async function main() {
  for (const school of seedSchools) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: {},
      create: {
        id: school.id,
        name: school.name,
        theme: school.theme,
        logoUrl: school.logoUrl,
        showDepedLogo: school.showDepedLogo,
        notificationPreference: school.notificationPreference,
      },
    });
  }

  const schools = await prisma.school.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
  console.log(`Seeded ${schools.length} schools:`);
  for (const school of schools) {
    console.log(
      `- ${school.id}: ${school.name}(${school.notificationPreference})`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
