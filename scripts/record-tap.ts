import "dotenv/config";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { schoolRepository } from "@/data/repositories";
import { getNow } from "@/lib/clock";
import { prisma } from "@/lib/db";
import { formatSchoolTime } from "@/lib/school-time";
import { authenticateDevice } from "@/services/devices/authenticate-device";
import { recordTap, type RecordTapResult } from "@/services/taps/record-tap";

/**
 * Records taps typed or scanned into the terminal, through the same
 * `recordTap()` the gate's web address will call (Step 46). Usage:
 *
 *   npm run tap:record -- --token tal_dev_…
 *
 * Click the terminal and tap a card on the USB reader: it types the card's
 * 10 digits and presses Enter, which is one tap. Hex typed by hand works
 * too. Ctrl+C stops. Uses the real clock, or DEMO_NOW when it's set.
 */
function describe(result: RecordTapResult): string {
  switch (result.outcome) {
    case "invalid_serial":
      return "not a card serial";
    case "duplicate": {
      const who = result.student ? `${result.student.firstName} ${result.student.lastName}` : "this card";
      return `duplicate  ${who} already tapped at ${formatSchoolTime(result.previousTap.tappedAt)}`;
    }
    case "unknown_card":
      return `unknown card ${result.tap.cardSerial} (not linked to a student at this school)`;
    case "lost_card": {
      const who = result.student ? `${result.student.firstName} ${result.student.lastName}'s` : "a";
      return `lost card  ${who} card ${result.tap.cardSerial}, alert raised`;
    }
    case "recorded": {
      const { student, tap } = result;
      const direction = result.direction === "time_in" ? "time in " : "time out";
      return [
        `${direction}  ${student.firstName} ${student.lastName}, Grade ${student.gradeLevel} – ${student.section},`,
        formatSchoolTime(tap.tappedAt),
        result.notified ? " (parent notified)" : "",
      ].join(" ");
    }
  }
}

async function main() {
  const { values } = parseArgs({ options: { token: { type: "string" } } });
  if (!values.token) throw new Error("Usage: npm run tap:record -- --token <gate device token>");

  const device = await authenticateDevice(`Bearer ${values.token}`);
  if (!device) throw new Error("That token isn't an active device. Make one with npm run device:create.");
  if (device.kind !== "gate") throw new Error(`"${device.label}" is a ${device.kind}; only a gate records taps.`);

  const school = await schoolRepository.getById(device.schoolId);
  console.log(`Connected as "${device.label}" (${school?.name ?? device.schoolId}). Tap a card, Ctrl+C to stop.`);

  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const now = getNow();
    const result = await recordTap({
      device,
      clientTapId: crypto.randomUUID(),
      rawSerial: line,
      clientTappedAt: now,
      receivedAt: now,
    });
    console.log(`  ${describe(result)}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
