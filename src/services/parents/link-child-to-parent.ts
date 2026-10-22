import {
  linkAttemptRepository,
  parentStudentLinkRepository,
  schoolRepository,
  studentRepository,
  type LinkAttemptRepository,
  type ParentStudentLinkRepository,
  type SchoolRepository,
  type StudentRepository,
} from "@/data/repositories";
import { TOO_MANY_TRIES_MESSAGE } from "@/features/auth/messages";
import { linkChildSchema } from "@/features/parents/auth-schemas";
import type { LinkChildInput } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import { sessionSecret } from "@/lib/env";
import { parentLinkThrottle, type LoginThrottle } from "@/services/auth/login-throttle";
import { firstFieldErrors } from "./field-errors";
import { countLinkTry, linkAttemptKey, TOO_MANY_LINK_TRIES_MESSAGE } from "./link-attempts";

export const NO_MATCHING_CHILD_MESSAGE =
  "We couldn't find a student with that LRN, last name and birth date at that school.";

export type LinkChildFieldErrors = Partial<Record<keyof LinkChildInput, string>>;

export type LinkChildResult =
  /** `noticesMade`: how many of the child's other guardians were told (Step 55.2); wake the push worker if any. */
  | { ok: true; student: Student; noticesMade: number }
  | { ok: false; code: "invalid_input"; fieldErrors: LinkChildFieldErrors }
  | { ok: false; code: "no_match" | "already_linked" | "too_many_tries"; formError: string };

export type LinkChildDeps = {
  schools: Pick<SchoolRepository, "getById">;
  students: Pick<StudentRepository, "findForLink">;
  links: Pick<ParentStudentLinkRepository, "listByParent" | "createWithNotices">;
  /** The per-child count of tries, in Postgres (Step 55.1). */
  attempts: LinkAttemptRepository;
  /** The per-parent count of wrong tries, in memory (Step 55.1). */
  parentThrottle: LoginThrottle;
  /** The key a child's tries are counted under (`linkAttemptKey`, with the server's secret). */
  attemptKey: (schoolId: string, lrn: string, lastName: string) => string;
};

/** The live repositories and limits, shared by the web portal and the parent app's API. */
export function liveLinkChildDeps(): LinkChildDeps {
  return {
    schools: schoolRepository,
    students: studentRepository,
    links: parentStudentLinkRepository,
    attempts: linkAttemptRepository,
    parentThrottle: parentLinkThrottle,
    attemptKey: (schoolId, lrn, lastName) => linkAttemptKey(sessionSecret(), schoolId, lrn, lastName),
  };
}

function alreadyLinked(student: Student): LinkChildResult {
  return {
    ok: false,
    code: "already_linked",
    formError: `${student.firstName} ${student.lastName} is already linked to your account.`,
  };
}

/**
 * "Link a child" (Step 22, with the school since Step 53): accepted only
 * when a student at the chosen school matches the LRN, last name and birth
 * date. The link saves that school, so every later read uses the school the
 * server checked, never one sent by a browser or the app. No link code to
 * hand out (CLAUDE.md's domain rules).
 *
 * Guessing is limited two ways (Step 55.1): 5 wrong tries by one parent in
 * 15 minutes, and 10 tries for one child (school, LRN and last name) in 24
 * hours from anyone. The child's try is saved and counted before the
 * student is looked up, so a locked child answers the same whether or not
 * the details match anyone.
 *
 * The link is saved with a notice for each of the child's other guardians
 * (Step 55.2): with no principal approving links, the people who already
 * care for the child are the ones who notice a stranger.
 */
export async function linkChildToParent(
  parentId: string,
  input: unknown,
  deps: LinkChildDeps = liveLinkChildDeps(),
  now: number = Date.now(),
): Promise<LinkChildResult> {
  const parsed = linkChildSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", fieldErrors: firstFieldErrors(parsed.error) };

  if (deps.parentThrottle.isLocked(parentId, now)) {
    return { ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE };
  }

  const school = await deps.schools.getById(parsed.data.schoolId);
  if (!school) return { ok: false, code: "invalid_input", fieldErrors: { schoolId: "Select your child's school" } };

  const { lrn, lastName } = parsed.data;
  const linkTry = await countLinkTry(
    deps.attempts,
    { schoolId: school.id, keyHash: deps.attemptKey(school.id, lrn, lastName) },
    now,
  );
  if (linkTry.locked) return { ok: false, code: "too_many_tries", formError: TOO_MANY_LINK_TRIES_MESSAGE };

  const student = await deps.students.findForLink(school.id, parsed.data);
  if (!student) {
    deps.parentThrottle.recordFailure(parentId, now);
    return { ok: false, code: "no_match", formError: NO_MATCHING_CHILD_MESSAGE };
  }
  // The right details aren't a guess.
  await deps.attempts.remove(linkTry.id);

  const existingLinks = await deps.links.listByParent(parentId);
  if (existingLinks.some((link) => link.studentId === student.id)) return alreadyLinked(student);

  // The same form sent twice at once passes the check above both times; the
  // repository keeps one link and answers null for the other.
  const saved = await deps.links.createWithNotices({
    id: crypto.randomUUID(),
    schoolId: school.id,
    parentId,
    studentId: student.id,
    linkedAt: new Date(now).toISOString(),
  });
  return saved ? { ok: true, student, noticesMade: saved.noticesMade } : alreadyLinked(student);
}
