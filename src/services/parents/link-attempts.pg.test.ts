// @vitest-environment node
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPrismaLinkAttemptRepository,
  createPrismaParentStudentLinkRepository,
  createPrismaSchoolRepository,
  createPrismaStudentRepository,
} from "@/data/repositories";
import { PrismaClient } from "@/generated/prisma/client";
import { createLoginThrottle } from "@/services/auth/login-throttle";
import { linkChildToParent, type LinkChildDeps } from "./link-child-to-parent";
import { LINK_TRIES_PER_CHILD, linkAttemptKey } from "./link-attempts";

/**
 * The per-child limit against real Postgres (Step 55.1): someone with a
 * child's LRN and last name sends every birth date at once, from many
 * accounts. Saving each try before counting it is what keeps more than 10
 * from getting through, and only a real database shows that. A secret of
 * its own per run keeps other runs' tries out of the count; its rows are
 * removed afterwards. Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

// Jose Pascual, Balanga's demo child (src/data/seed/students.ts).
const SCHOOL = "school-balanga";
const LRN = "100000000002";
const LAST_NAME = "Pascual";
const TRIES = 50;

describeWithDatabase("link-a-child limits on Postgres (Step 55.1; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const secret = `link-attempts-pg-test-${Date.now()}`;
  const keyHash = linkAttemptKey(secret, SCHOOL, LRN, LAST_NAME);
  const deps: LinkChildDeps = {
    schools: createPrismaSchoolRepository(db),
    students: createPrismaStudentRepository(db),
    links: createPrismaParentStudentLinkRepository(db),
    attempts: createPrismaLinkAttemptRepository(db),
    // Every try comes from a different account here, so the per-parent limit never applies.
    parentThrottle: createLoginThrottle({ maxFailures: 1_000, windowMs: 60_000 }),
    attemptKey: (schoolId, lrn, lastName) => linkAttemptKey(secret, schoolId, lrn, lastName),
  };

  afterAll(async () => {
    await db.linkAttempt.deleteMany({ where: { keyHash } });
    await db.$disconnect();
  });

  it(`lets at most ${LINK_TRIES_PER_CHILD} of ${TRIES} wrong tries sent at once reach the student lookup`, async () => {
    const now = Date.now();
    const results = await Promise.all(
      Array.from({ length: TRIES }, (_, i) =>
        linkChildToParent(
          `link-attempts-pg-test-parent-${i}`,
          // Wrong birth dates: Jose was born on 2014-03-03.
          {
            schoolId: SCHOOL,
            lrn: LRN,
            lastName: LAST_NAME,
            birthDate: `2013-01-${String((i % 28) + 1).padStart(2, "0")}`,
          },
          deps,
          now,
        ),
      ),
    );
    const looked = results.filter((result) => !result.ok && result.code === "no_match").length;
    const refused = results.filter((result) => !result.ok && result.code === "too_many_tries").length;

    expect(looked).toBeLessThanOrEqual(LINK_TRIES_PER_CHILD);
    expect(looked + refused).toBe(TRIES);
    // Only the wrong tries that were looked up stay counted: refused ones are taken back.
    await expect(db.linkAttempt.count({ where: { keyHash } })).resolves.toBe(looked);
  });
});
