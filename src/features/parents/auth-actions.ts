"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  parentRepository,
  parentStudentLinkRepository,
  schoolRepository,
  studentRepository,
} from "@/data/repositories";
import { getParentSession } from "@/lib/parent-session";
import { clearParentSession, setParentSession } from "@/lib/parent-session-actions";
import { linkChildSchema, parentLoginSchema, parentSignupSchema } from "./auth-schemas";
import type { LinkChildInput, ParentLoginInput, ParentSignupInput } from "./types";

export type ParentSignupFieldErrors = Partial<Record<keyof ParentSignupInput, string>>;
export type ParentSignupActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: ParentSignupFieldErrors };

export type ParentLoginActionResult = { ok: true } | { ok: false; formError: string };

export type LinkChildFieldErrors = Partial<Record<keyof LinkChildInput, string>>;
export type LinkChildActionResult =
  | { ok: true; studentName: string }
  | { ok: false; formError?: string; fieldErrors?: LinkChildFieldErrors };

function fieldErrorsFrom<Shape extends Record<string, unknown>>(
  error: import("zod").ZodError<Shape>,
): Partial<Record<keyof Shape, string>> {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: Partial<Record<keyof Shape, string>> = {};
  for (const key of Object.keys(flattened) as (keyof Shape)[]) {
    const [firstMessage] = flattened[key] ?? [];
    if (firstMessage) fieldErrors[key] = firstMessage;
  }
  return fieldErrors;
}

/**
 * Step 22's signup. Re-validates with the same `parentSignupSchema` the
 * client already checked (CLAUDE.md: "validated on both sides"), then sends
 * a fresh account straight into "link a child" — a parent account is only
 * useful once at least one child is linked, though nothing forces them to
 * finish that today (see the (protected) home page's empty state).
 */
export async function signUpParent(input: ParentSignupInput): Promise<ParentSignupActionResult> {
  const parsed = parentSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const school = await schoolRepository.getById(parsed.data.schoolId);
  if (!school) {
    return { ok: false, formError: "That school could not be found." };
  }

  const existing = await parentRepository.findByEmail(parsed.data.email);
  if (existing) {
    return { ok: false, fieldErrors: { email: "An account with this email already exists." } };
  }

  const parent = await parentRepository.create(
    {
      id: crypto.randomUUID(),
      schoolId: parsed.data.schoolId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      mobile: parsed.data.mobile,
      email: parsed.data.email,
    },
    parsed.data.password,
  );

  await setParentSession(parent.id);
  refresh();
  redirect("/parent/link-child");
}

/**
 * Step 22's sign-in. Deliberately vague about which of email or password
 * was wrong, the same reasoning any real login screen would use.
 */
export async function signInParent(input: ParentLoginInput): Promise<ParentLoginActionResult> {
  const parsed = parentLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, formError: "Enter a valid email and password." };
  }

  const parent = await parentRepository.verifyPassword(parsed.data.email, parsed.data.password);
  if (!parent) {
    return { ok: false, formError: "That email or password isn't right." };
  }

  await setParentSession(parent.id);
  redirect("/parent");
}

export async function signOutParent(): Promise<void> {
  await clearParentSession();
  redirect("/parent/login");
}

/**
 * Step 22's "link a child" — verified by LRN, last name and birth date
 * (CLAUDE.md's domain rules), no link code to distribute. Both the "no
 * match" and "already linked" errors CLAUDE.md asks for come back as a
 * `formError` here, following the same convention `card-actions.ts` uses.
 */
export async function linkChild(input: LinkChildInput): Promise<LinkChildActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: "Your session has expired — sign in again." };
  }

  const parsed = linkChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const student = await studentRepository.findForLink(session.schoolId, parsed.data);
  if (!student) {
    return {
      ok: false,
      formError: "We couldn't find a student with that LRN, last name and birth date at your school.",
    };
  }

  const existingLinks = await parentStudentLinkRepository.listByParent(session.parentId);
  if (existingLinks.some((link) => link.studentId === student.id)) {
    return { ok: false, formError: `${student.firstName} ${student.lastName} is already linked to your account.` };
  }

  await parentStudentLinkRepository.create({
    id: crypto.randomUUID(),
    schoolId: session.schoolId,
    parentId: session.parentId,
    studentId: student.id,
    linkedAt: new Date().toISOString(),
  });

  refresh();
  return { ok: true, studentName: `${student.firstName} ${student.lastName}` };
}
