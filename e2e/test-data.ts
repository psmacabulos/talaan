/**
 * Shared test data generation for end-to-end tests.
 *
 * Tests run concurrently against one app instance with shared in-memory seed
 * data. To avoid collisions, each test that creates records uses a unique
 * namespace (generated at runtime) for names, emails and LRNs, and never
 * edits records that other tests read.
 */

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
 * The seed parent used by the parent flow test (student-0006, linked to
 * parent-balanga-1 in parent-student-links.ts). Must remain stable across
 * test runs so the test can find and use this existing link.
 */
export const SEED_PARENT_EMAIL = "parent-one@balanga.example";
export const SEED_PARENT_PASSWORD = "password123"; // Hardcoded in seed (step 22)
export const SEED_STUDENT_LRN_FOR_PARENT_TEST = "100000006"; // student-0006
export const SEED_STUDENT_LAST_NAME_FOR_PARENT_TEST = "Abad"; // matches student-0006
export const SEED_STUDENT_BIRTH_DATE_FOR_PARENT_TEST = "2012-07-18"; // matches student-0006
