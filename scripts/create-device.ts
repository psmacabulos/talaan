import "dotenv/config";
import { parseArgs } from "node:util";
import { schoolRepository } from "@/data/repositories";
import { DEVICE_LIMIT_MESSAGE, DEVICE_NAME_IN_USE_MESSAGE } from "@/features/devices/names";
import { deviceKindSchema } from "@/features/devices/schemas";
import { prisma } from "@/lib/db";
import { createDevice } from "@/services/devices/create-device";

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

  const created = await createDevice({ schoolId: school.id, kind: kind.data, label: values.label });
  if (!created.ok) {
    throw new Error(created.reason === "name-in-use" ? DEVICE_NAME_IN_USE_MESSAGE : DEVICE_LIMIT_MESSAGE);
  }

  console.log(`Created ${created.device.kind} "${created.device.label}" for ${school.name}.`);
  console.log(`Device id: ${created.device.id}`);
  console.log("");
  console.log("Token (shown only this once; enter it on the device, then don't keep a copy):");
  console.log(created.token);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
