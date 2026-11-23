import {
  parentRepository,
  parentStudentLinkRepository,
  schoolRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { readJsonBody, requestAddress, requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toChildTodayJson, toParentJson } from "@/features/parents/api-responses";
import { getNow } from "@/lib/clock";
import { parentAddressThrottle, parentSignInThrottle } from "@/services/auth/login-throttle";
import { childrenToday } from "@/services/parents/children-today";
import { deleteParentAccount } from "@/services/parents/delete-parent-account";

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

/**
 * Deletes the signed-in parent's account (Step 60.2), for the app's "Delete
 * my account". The body is `{ "password": "…" }`, and is never logged. 204
 * when it's done; 403 `wrong_password` (never 401, which the app takes as
 * "signed out") when the password is wrong; 429 when there have been too
 * many tries; 401 when the account or this sign-in is already gone. The app
 * must forget its stored token and push registration on 204: every sign-in
 * of this parent stopped working in that same moment.
 */
export async function DELETE(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const read = await readJsonBody(request);
  if (!read || typeof read.body !== "object" || read.body === null) {
    return apiError("invalid_input", "The request body isn't JSON.");
  }

  const result = await deleteParentAccount(caller.parentId, (read.body as Record<string, unknown>).password, {
    parents: parentRepository,
    throttle: parentSignInThrottle,
    addressThrottle: parentAddressThrottle,
    address: requestAddress(request),
    now: Date.now(),
  });
  if (!result.ok) return apiError(result.code, result.formError);
  return new Response(null, { status: 204 });
}
