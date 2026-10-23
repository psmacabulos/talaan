import { describe, expect, it } from "vitest";
import type { LinkAttemptRepository } from "@/data/repositories";
import { createMockParentStudentLinkRepository } from "@/data/repositories/parent-student-link-repository";
import { createMockSchoolRepository } from "@/data/repositories/school-repository";
import { createMockStudentRepository } from "@/data/repositories/student-repository";
import type { Notification } from "@/features/parents/types";
import type { School } from "@/features/schools/types";
import type { Student } from "@/features/students/types";
import { TOO_MANY_TRIES_MESSAGE } from "@/features/auth/messages";
import { createLoginThrottle } from "@/services/auth/login-throttle";
import {
  LINK_BLOCKED_MESSAGE,
  linkChildToParent,
  NO_MATCHING_CHILD_MESSAGE,
  type LinkChildDeps,
} from "./link-child-to-parent";
import { LINK_TRIES_PER_CHILD, linkAttemptKey, TOO_MANY_LINK_TRIES_MESSAGE } from "./link-attempts";

const schoolA: School = {
  id: "school-a",
  name: "School A",
  theme: { kind: "preset", presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only",
  lateAfter: "08:05",
  absentFrom: "09:00",
};
const schoolB: School = { ...schoolA, id: "school-b", name: "School B" };

const juan: Student = {
  id: "student-juan",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-14",
  lrn: "100000000123",
  gradeLevel: 8,
  section: "Rizal",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

const details = { schoolId: "school-a", lrn: "100000000123", lastName: "dela cruz", birthDate: "2012-03-14" };

const NOW = Date.parse("2026-10-21T01:00:00Z");

/** The Postgres table's behaviour, in memory: what was saved, and when. */
function fakeAttempts(): LinkAttemptRepository & { rows: { id: string; keyHash: string; at: string }[] } {
  const rows: { id: string; keyHash: string; at: string }[] = [];
  return {
    rows,
    async record({ keyHash, at }) {
      const id = `attempt-${rows.length + 1}`;
      rows.push({ id, keyHash, at });
      return id;
    },
    async countSince(keyHash, since) {
      return rows.filter((row) => row.keyHash === keyHash && row.at >= since).length;
    },
    async remove(id) {
      rows.splice(
        rows.findIndex((row) => row.id === id),
        1,
      );
    },
    async deleteOlderThan(before) {
      const old = rows.filter((row) => row.at < before);
      for (const row of old) rows.splice(rows.indexOf(row), 1);
      return old.length;
    },
  };
}

/** The notices the mock link repository made (Step 55.2), kept apart from the seed's. */
let notices: Notification[] = [];

function deps(attempts = fakeAttempts()): LinkChildDeps {
  notices = [];
  return {
    schools: createMockSchoolRepository([schoolA, schoolB], { latencyMs: 0 }),
    students: createMockStudentRepository([juan], { latencyMs: 0 }),
    links: createMockParentStudentLinkRepository([], { latencyMs: 0, notifications: notices }),
    attempts,
    parentThrottle: createLoginThrottle({ maxFailures: 5, windowMs: 15 * 60_000 }),
    attemptKey: (schoolId, lrn, lastName) => linkAttemptKey("test-secret", schoolId, lrn, lastName),
  };
}

const wrongBirthDate = { ...details, birthDate: "2012-03-15" };

describe("linkChildToParent", () => {
  it("links a child whose details match at the chosen school, and saves that school", async () => {
    const d = deps();
    await expect(linkChildToParent("parent-a", details, d, NOW)).resolves.toEqual({
      ok: true,
      student: juan,
      noticesMade: 0,
    });
    await expect(d.links.listByParent("parent-a")).resolves.toMatchObject([
      { parentId: "parent-a", studentId: juan.id, schoolId: "school-a" },
    ]);
  });

  it("finds no match at another school, even with the right details", async () => {
    await expect(linkChildToParent("parent-a", { ...details, schoolId: "school-b" }, deps())).resolves.toEqual({
      ok: false,
      code: "no_match",
      formError: NO_MATCHING_CHILD_MESSAGE,
    });
  });

  it("asks for a school again when it doesn't exist", async () => {
    await expect(linkChildToParent("parent-a", { ...details, schoolId: "school-zzz" }, deps())).resolves.toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { schoolId: "Select your child's school" },
    });
  });

  it("returns each field's first message for bad input", async () => {
    const result = await linkChildToParent("parent-a", { ...details, lrn: "12" }, deps());
    expect(result).toMatchObject({ ok: false, code: "invalid_input", fieldErrors: { lrn: expect.any(String) } });
  });

  it("says a child is already linked, the second time", async () => {
    const d = deps();
    await linkChildToParent("parent-a", details, d, NOW);
    await expect(linkChildToParent("parent-a", details, d, NOW)).resolves.toEqual({
      ok: false,
      code: "already_linked",
      formError: "Juan Dela Cruz is already linked to your account.",
    });
  });

  it("says 'already linked' when the same form sent twice at once loses the race", async () => {
    const d = deps();
    const racing: LinkChildDeps = {
      ...d,
      links: { listByParent: async () => [], createWithNotices: async () => ({ outcome: "already_linked" }) },
    };
    await expect(linkChildToParent("parent-a", details, racing)).resolves.toMatchObject({ code: "already_linked" });
  });
});

describe("linkChildToParent tells the child's other guardians (Step 55.2)", () => {
  it("makes one notice, for the guardian already linked, naming the new one", async () => {
    const d = deps();
    await linkChildToParent("parent-first", details, d, NOW);
    expect(notices).toEqual([]);

    await expect(linkChildToParent("parent-second", details, d, NOW + 60_000)).resolves.toMatchObject({
      ok: true,
      noticesMade: 1,
    });
    expect(notices).toEqual([
      {
        id: expect.any(String),
        schoolId: "school-a",
        studentId: juan.id,
        kind: "guardian_linked",
        tappedAt: new Date(NOW + 60_000).toISOString(),
        read: false,
        recipientParentId: "parent-first",
        aboutParentId: "parent-second",
      },
    ]);
  });

  it("tells every guardian already linked, and makes nothing when the link isn't new", async () => {
    const d = deps();
    await linkChildToParent("parent-1", details, d, NOW);
    await linkChildToParent("parent-2", details, d, NOW);
    await expect(linkChildToParent("parent-3", details, d, NOW)).resolves.toMatchObject({ noticesMade: 2 });
    // parent-2's link told parent-1; parent-3's told both.
    expect(notices.map((notice) => notice.recipientParentId)).toEqual(["parent-1", "parent-1", "parent-2"]);

    await linkChildToParent("parent-3", details, d, NOW);
    expect(notices).toHaveLength(3);
  });

  it("saves the link at the time it's given", async () => {
    const d = deps();
    await linkChildToParent("parent-a", details, d, NOW);
    await expect(d.links.listByParent("parent-a")).resolves.toMatchObject([{ linkedAt: new Date(NOW).toISOString() }]);
  });
});

describe("linkChildToParent and a parent the school removed (Step 55.4)", () => {
  it("refuses them with the right details, and says to contact the school", async () => {
    const d = deps();
    const blocked: LinkChildDeps = {
      ...d,
      links: { listByParent: async () => [], createWithNotices: async () => ({ outcome: "blocked" }) },
    };
    await expect(linkChildToParent("parent-a", details, blocked, NOW)).resolves.toEqual({
      ok: false,
      code: "link_blocked",
      formError: LINK_BLOCKED_MESSAGE,
    });
  });

  it("answers no match, not blocked, for wrong details: a block reveals nothing to a guesser", async () => {
    const d = deps();
    const blocked: LinkChildDeps = {
      ...d,
      links: { listByParent: async () => [], createWithNotices: async () => ({ outcome: "blocked" }) },
    };
    await expect(linkChildToParent("parent-a", wrongBirthDate, blocked, NOW)).resolves.toMatchObject({
      code: "no_match",
    });
  });
});

describe("linkChildToParent's limits on guessing (Step 55.1)", () => {
  it("stops one parent after 5 wrong tries in 15 minutes, before looking anyone up", async () => {
    const d = deps();
    for (let i = 0; i < 5; i++) {
      await expect(linkChildToParent("parent-a", wrongBirthDate, d, NOW)).resolves.toMatchObject({ code: "no_match" });
    }
    await expect(linkChildToParent("parent-a", details, d, NOW)).resolves.toEqual({
      ok: false,
      code: "too_many_tries",
      formError: TOO_MANY_TRIES_MESSAGE,
    });
    // Another parent isn't held back by it.
    await expect(linkChildToParent("parent-b", details, d, NOW)).resolves.toMatchObject({ ok: true });
  });

  it("locks one child after 10 tries in 24 hours, from any number of accounts, even with the right details", async () => {
    const d = deps();
    for (let i = 0; i < LINK_TRIES_PER_CHILD; i++) {
      await expect(linkChildToParent(`parent-${i}`, wrongBirthDate, d, NOW)).resolves.toMatchObject({
        code: "no_match",
      });
    }
    await expect(linkChildToParent("parent-real", details, d, NOW)).resolves.toEqual({
      ok: false,
      code: "too_many_tries",
      formError: TOO_MANY_LINK_TRIES_MESSAGE,
    });
    // A day later, the old tries no longer count.
    await expect(linkChildToParent("parent-real", details, d, NOW + 24 * 60 * 60_000 + 1)).resolves.toMatchObject({
      ok: true,
    });
  });

  it("doesn't stretch the lock when someone keeps trying during it", async () => {
    const d = deps();
    const HOUR = 60 * 60_000;
    for (let i = 0; i < LINK_TRIES_PER_CHILD; i++) await linkChildToParent(`parent-${i}`, wrongBirthDate, d, NOW);
    // Refused tries through the day, the last one just before the 24 hours are up.
    for (const hours of [1, 12, 23.9]) {
      await expect(linkChildToParent("parent-x", details, d, NOW + hours * HOUR)).resolves.toMatchObject({
        code: "too_many_tries",
      });
    }
    await expect(linkChildToParent("parent-real", details, d, NOW + 24 * HOUR + 1)).resolves.toMatchObject({
      ok: true,
    });
  });

  it("counts the child by last name however it's typed, and not another child", async () => {
    const d = deps();
    for (let i = 0; i < LINK_TRIES_PER_CHILD; i++) {
      await linkChildToParent(
        `parent-${i}`,
        { ...wrongBirthDate, lastName: i % 2 ? " DELA CRUZ " : "dela cruz" },
        d,
        NOW,
      );
    }
    await expect(linkChildToParent("parent-x", { ...details, lastName: "Dela Cruz" }, d, NOW)).resolves.toMatchObject({
      code: "too_many_tries",
    });
    await expect(
      linkChildToParent("parent-x", { ...wrongBirthDate, lrn: "100000000124" }, d, NOW),
    ).resolves.toMatchObject({ code: "no_match" });
  });

  it("takes back the try of a parent who got the details right", async () => {
    const attempts = fakeAttempts();
    await expect(linkChildToParent("parent-a", details, deps(attempts), NOW)).resolves.toMatchObject({ ok: true });
    expect(attempts.rows).toEqual([]);
  });
});

describe("linkAttemptKey", () => {
  it("is the same for the same child, never contains the LRN, and depends on the secret", () => {
    const key = linkAttemptKey("secret-a", "school-a", "100000000123", "Dela Cruz");
    expect(linkAttemptKey("secret-a", "school-a", "100000000123", " dela cruz ")).toBe(key);
    expect(key).not.toContain("100000000123");
    expect(linkAttemptKey("secret-b", "school-a", "100000000123", "Dela Cruz")).not.toBe(key);
    expect(linkAttemptKey("secret-a", "school-b", "100000000123", "Dela Cruz")).not.toBe(key);
  });
});
