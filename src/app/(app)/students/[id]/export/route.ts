import { getSession } from "@/lib/session";
import { exportStudentData } from "@/services/students/student-privacy";

/**
 * The student's data as a file (Step 60.3), for the principal to hand to
 * their guardian. It is a page's own download, not part of `/api/v1`: only
 * a browser signed in as staff uses it. The school is the session's own,
 * so another school's student is the same "not found" as none; a teacher,
 * or a super admin with no school open, is refused. Never cached: it is a
 * child's personal data.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Sign in first.", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { id } = await params;
  const result = await exportStudentData(session, id);
  if (!result.ok) {
    return result.code === "forbidden"
      ? new Response("You can't download student data.", { status: 403, headers: { "Cache-Control": "no-store" } })
      : new Response("That student could not be found.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return new Response(result.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // The name is letters, digits and dashes only (`fileSlug`), so it can't break out of the header.
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
