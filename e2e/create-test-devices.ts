import "dotenv/config";
import { deviceRepository } from "@/data/repositories";
import { prisma } from "@/lib/db";
import { hashDeviceToken } from "@/services/devices/device-token";
import { TEST_GATE_TOKEN, TEST_MONITOR_TOKEN, TEST_OCEANVIEW_GATE_TOKEN } from "./test-data";

/**
 * Gives the browser-test database a gate device (Step 47), a monitor
 * (Step 48) and a second school's gate (Step 51), whose tokens only the
 * tests know. Run by global-setup.ts after the reset, against the test
 * database only; never part of the demo seed, so no known token can reach
 * a real install.
 */
async function main() {
  await deviceRepository.create(
    {
      id: "e2e-gate",
      schoolId: "school-balanga",
      label: "Test gate",
      kind: "gate",
      status: "active",
      lastSeenAt: null,
    },
    hashDeviceToken(TEST_GATE_TOKEN),
  );
  await deviceRepository.create(
    {
      id: "e2e-monitor",
      schoolId: "school-balanga",
      label: "Test guardhouse TV",
      kind: "monitor",
      status: "active",
      lastSeenAt: null,
    },
    hashDeviceToken(TEST_MONITOR_TOKEN),
  );
  // A gate at another school, for the isolation tests (Step 51).
  await deviceRepository.create(
    {
      id: "e2e-gate-oceanview",
      schoolId: "school-oceanview",
      label: "Test gate (Oceanview)",
      kind: "gate",
      status: "active",
      lastSeenAt: null,
    },
    hashDeviceToken(TEST_OCEANVIEW_GATE_TOKEN),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
