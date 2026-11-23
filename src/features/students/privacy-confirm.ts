import type { Student } from "./types";

/** The name a principal types to confirm deleting a student: first and last name, as every list shows it. */
export function confirmationNameOf(student: Pick<Student, "firstName" | "lastName">): string {
  return `${student.firstName} ${student.lastName}`;
}

/** Whether what was typed is that name, ignoring case and extra or odd spaces (a phone keyboard adds them). */
export function isConfirmed(typed: string, student: Pick<Student, "firstName" | "lastName">): boolean {
  return normalize(typed) === normalize(confirmationNameOf(student));
}

function normalize(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** A file name from a last name: letters and digits only, so a quote or slash in a name can't reach the header. */
export function fileSlug(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "student";
}
