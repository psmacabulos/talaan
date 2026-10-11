import { cardRepository, studentRepository } from "@/data/repositories";
import { buildGateRoster, rosterETag } from "@/features/gate/roster";
import { authenticateGate } from "@/services/devices/authenticate-gate";

/**
 * The gate's own copy of who can tap here (Step 46): active cards, and each
 * student's name, grade and section. The ETag lets the gate ask "anything
 * new?" every few minutes and get a near-empty 304 when nothing changed.
 */
export async function GET(request: Request) {
  const auth = await authenticateGate(request.headers.get("authorization"));
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const { schoolId } = auth.device;
  const [cards, students] = await Promise.all([
    cardRepository.listActiveBySchool(schoolId),
    studentRepository.listBySchool(schoolId),
  ]);

  const body = JSON.stringify(buildGateRoster(cards, students));
  const etag = rosterETag(body);
  // Always ask before reusing a stored copy, but let the tag make that cheap.
  const headers = { ETag: etag, "Cache-Control": "no-cache" };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
}
