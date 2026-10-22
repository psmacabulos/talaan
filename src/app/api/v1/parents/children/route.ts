import { parentStudentLinkRepository, schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { readJsonBody, requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toChildTodayJson } from "@/features/parents/api-responses";
import { getNow } from "@/lib/clock";
import { childrenToday } from "@/services/parents/children-today";
import { linkChildToParent } from "@/services/parents/link-child-to-parent";
import { wakePushWorker } from "@/services/push/push-worker";

/**
 * Links a child from the app (Step 53.3): the school, LRN, last name and
 * birth date, by `linkChildToParent`'s rules, the same as the web's. The
 * answer is the child's day so far, the same shape as in `/me`.
 */
export async function POST(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const read = await readJsonBody(request);
  if (!read) return apiError("invalid_input", "The request body isn't JSON.");

  const result = await linkChildToParent(caller.parentId, read.body);
  if (!result.ok) {
    if (result.code === "invalid_input")
      return apiError("invalid_input", API_MESSAGES.invalidInput, result.fieldErrors);
    if (result.code === "too_many_tries") return apiError("too_many_tries", result.formError);
    return apiError(result.code === "no_match" ? "not_found" : "conflict", result.formError);
  }
  // The child's other guardians are told (Step 55.2); send their pushes now.
  if (result.noticesMade > 0) wakePushWorker();

  const children = await childrenToday(
    caller.parentId,
    getNow(),
    { links: parentStudentLinkRepository, students: studentRepository, schools: schoolRepository, taps: tapRepository },
    { recentTaps: 0 },
  );
  const linked = children.find((child) => child.student.id === result.student.id);
  const child = linked ? toChildTodayJson(linked) : null;
  if (!child) return apiError("not_found", API_MESSAGES.notFound);
  return Response.json({ child }, { status: 201 });
}
