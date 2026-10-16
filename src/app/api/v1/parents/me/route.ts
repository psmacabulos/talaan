import {
  parentRepository,
  parentStudentLinkRepository,
  schoolRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toChildTodayJson, toParentJson } from "@/features/parents/api-responses";
import { getNow } from "@/lib/clock";
import { childrenToday } from "@/services/parents/children-today";

/** The signed-in parent and each linked child's day so far (Step 53.3): today's taps only, never their history. */
export async function GET(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const parent = await parentRepository.getById(caller.parentId);
  if (!parent) return apiError("unauthorized", API_MESSAGES.unauthorized);

  const children = await childrenToday(
    caller.parentId,
    getNow(),
    { links: parentStudentLinkRepository, students: studentRepository, schools: schoolRepository, taps: tapRepository },
    { recentTaps: 0 },
  );
  return Response.json({
    parent: toParentJson(parent),
    children: children.map(toChildTodayJson).filter((child) => child !== null),
  });
}
