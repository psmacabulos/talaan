/**
 * Every active demo staff account signs in with this password, the same
 * one the demo parents use. Seed data only: real accounts set their own.
 */
export const SEED_STAFF_PASSWORD = "Talaan123!";

/**
 * `hashPassword(SEED_STAFF_PASSWORD)`, made once and kept fixed (a unit
 * test checks it still matches). Fixed rather than made at seed time so
 * the browser tests can make a signed session cookie whose password
 * fingerprint matches the database without reading it
 * (e2e/sessions.ts). No imports on purpose, so the tests can load it.
 */
export const SEED_STAFF_PASSWORD_HASH =
  "scrypt:qmExiiE2/EtW6yDZSl/AMQ==:3x9/o8sSchkZlx3fCl/xVlGu1kJ9sXPw8KAylaXYTw+XiMJGmBWZ6lOX2hSjjKB80qrqhs7iW8EAeGSZtAhx8Q==";

/**
 * The demo parents' stored hash (Step 55.6): the same demo password, so the
 * same fixed hash, which lets the browser tests make a parent cookie whose
 * password fingerprint matches the database, as they do for staff.
 */
export const SEED_PARENT_PASSWORD_HASH = SEED_STAFF_PASSWORD_HASH;
