import "dotenv/config";
import { parseArgs } from "node:util";
import { deviceRepository, schoolRepository } from "@/data/repositories";
import { deviceKindSchema } from "@/features/devices/schemas";
import { prisma } from "@/lib/db";
import { generateDeviceToken, hashDeviceToken } from "@/services/devices/device-token";

/**
 * Creates a gate or monitor device and prints its token, once. Usage:
 *
 *   npm run device:create -- --school school-balanga --kind gate --label "Main gate tablet"
 *
 * Runs against whatever DATABASE_URL points at, so the same command sets up
 * a device locally or (later) on the production server.
 */
async function main() {
  const { values } = parseArgs({
    options: {
      school: { type: "string" },
      kind: { type: "string" },
      label: { type: "string" },
    },
  });

  const kind = deviceKindSchema.safeParse(values.kind);
  if (!values.school || !kind.success || !values.label?.trim()) {
    throw new Error('Usage: npm run device:create -- --school <schoolId> --kind gate|monitor --label "<label>"');
  }

  const school = await schoolRepository.getById(values.school);
  if (!school) throw new Error(`No school with id "${values.school}".`);

  const token = generateDeviceToken();
  const device = await deviceRepository.create(
    {
      id: crypto.randomUUID(),
      schoolId: school.id,
      label: values.label.trim(),
      kind: kind.data,
      status: "active",
      lastSeenAt: null,
    },
    hashDeviceToken(token),
  );

  console.log(`Created ${device.kind} "${device.label}" for ${school.name}.`);
  console.log(`Device id: ${device.id}`);
  console.log("");
  console.log("Token (shown only this once; enter it on the device, then don't keep a copy):");
  console.log(token);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
