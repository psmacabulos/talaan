/**
 * Shared test data generation for end-to-end tests.
 *
 * Tests run concurrently against one app instance with shared in-memory seed
 * data. To avoid collisions, each test that creates records uses a unique
 * namespace (generated at runtime) for names, emails and LRNs, and never
 * edits records that other tests read.
 */

import { seedStudents } from "../src/data/seed/students";

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
