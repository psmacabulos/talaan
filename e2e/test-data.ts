/**
 * Shared test data generation for end-to-end tests.
 *
 * Tests run concurrently against one app instance with shared in-memory seed
 * data. To avoid collisions, each test that creates records uses a unique
 * namespace (generated at runtime) for names, emails and LRNs, and never
 * edits records that other tests read.
 */

import { seedStudents } from "../src/data/seed/students";
import { seedCards } from "../src/data/seed/cards";

/**
 * A unique suffix for this test run, used to namespace student/parent records
 * so they don't collide with other test runs.
 */
export const TEST_RUN_ID = Date.now().toString(36).slice(-6);

/**
 * Generates a unique test email address that won't collide with seed data
 * or other test runs.
 */
export function testEmail(purpose: string): string {
  return `test-${purpose}-${TEST_RUN_ID}@test.example`;
}

/**
 * Generates a unique LRN (12 digits) for this test run. Starts from
 * 999_000_000_000 so it doesn't collide with seed data (which uses
 * 100_000_000_000 + index for students).
 */
export function testLrn(index: number): string {
  const base = 999_000_000_000 + (parseInt(TEST_RUN_ID, 36) % 100_000) * 1_000;
  return String(base + index);
}

/**
 * Generates a unique student first name for this test run.
 */
export function testStudentName(purpose: string): string {
  return `Test${purpose.charAt(0).toUpperCase()}${purpose.slice(1)}${TEST_RUN_ID}`;
}

/**
 * The parent flow test (parent.spec.ts) can't assume any one specific seed
 * student gets tapped — in CI, station.spec.ts/a11y.spec.ts's tap-station
 * tests draw from the same shared pool of untapped students (see
 * playwright.config.ts's `workers` comment and students.ts's spare batch).
 * It reads back whichever name the tap station actually shows and looks
 * them up here instead.
 */
export function findBalangaStudentByFullName(fullName: string) {
  return seedStudents.find(
    (student) => student.schoolId === "school-balanga" && `${student.firstName} ${student.lastName}` === fullName,
  );
}

/** The test gate's token (Step 47), created only in the test database by create-test-devices.ts. */
export const TEST_GATE_TOKEN = "tal_dev_e2e_test_gate_token_not_for_real_use";
/** The test guardhouse monitor's token (Step 48), likewise only in the test database. */
export const TEST_MONITOR_TOKEN = "tal_dev_e2e_test_monitor_token_not_for_real_use";
/** A gate at the second demo school, Oceanview (Step 51's isolation tests), likewise only in the test database. */
export const TEST_OCEANVIEW_GATE_TOKEN = "tal_dev_e2e_oceanview_gate_token_not_for_real_use";

/**
 * What the owner's USB reader types for a card: its first 4 bytes, read as
 * one number lowest byte first, as 10 decimal digits ("53:2E:98:0C" →
 * "0211299923"). The reverse of normalizeCardSerial's digits branch.
 */
export function readerDigitsFor(serial: string): string {
  const bytes = serial
    .split(":")
    .slice(0, 4)
    .map((pair) => parseInt(pair, 16));
  const value = bytes.reduceRight((total, byte) => total * 256 + byte, 0);
  return String(value).padStart(10, "0");
}

/** A Balanga student's active card serial, by their full name. */
export function activeCardSerialFor(fullName: string): string {
  const student = findBalangaStudentByFullName(fullName);
  const card = seedCards.find((candidate) => candidate.studentId === student?.id && candidate.status === "active");
  if (!card) throw new Error(`No active seed card for ${fullName}.`);
  return card.serial;
}
