import type { ParentStudentLinkRepository, SchoolRepository, StudentRepository } from "@/data/repositories";
import { linkChildSchema } from "@/features/parents/auth-schemas";
import type { LinkChildInput } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import { firstFieldErrors } from "./field-errors";

export const NO_MATCHING_CHILD_MESSAGE =
  "We couldn't find a student with that LRN, last name and birth date at that school.";

export type LinkChildFieldErrors = Partial<Record<keyof LinkChildInput, string>>;

export type LinkChildResult =
  | { ok: true; student: Student }
  | { ok: false; code: "invalid_input"; fieldErrors: LinkChildFieldErrors }
  | { ok: false; code: "no_match" | "already_linked"; formError: string };

export type LinkChildDeps = {
  schools: Pick<SchoolRepository, "getById">;
  students: Pick<StudentRepository, "findForLink">;
  links: Pick<ParentStudentLinkRepository, "listByParent" | "create">;
};

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
 */
export async function linkChildToParent(
  parentId: string,
  input: unknown,
  deps: LinkChildDeps,
): Promise<LinkChildResult> {
  const parsed = linkChildSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", fieldErrors: firstFieldErrors(parsed.error) };

  const school = await deps.schools.getById(parsed.data.schoolId);
  if (!school) return { ok: false, code: "invalid_input", fieldErrors: { schoolId: "Select your child's school" } };

  const student = await deps.students.findForLink(school.id, parsed.data);
  if (!student) return { ok: false, code: "no_match", formError: NO_MATCHING_CHILD_MESSAGE };

  const existingLinks = await deps.links.listByParent(parentId);
  if (existingLinks.some((link) => link.studentId === student.id)) return alreadyLinked(student);

  // The same form sent twice at once passes the check above both times; the
  // repository keeps one link and answers null for the other.
  const link = await deps.links.create({
    id: crypto.randomUUID(),
    schoolId: school.id,
    parentId,
    studentId: student.id,
    linkedAt: new Date().toISOString(),
  });
  return link ? { ok: true, student } : alreadyLinked(student);
}
