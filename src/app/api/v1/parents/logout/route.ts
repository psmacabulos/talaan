import { parentTokenRepository } from "@/data/repositories";
import { requireParent } from "@/features/parents/api-request";
import { revokeParentToken } from "@/services/parents/parent-token";

/** Signs this phone out (Step 53.3): its token stops working at once. Step 53.4 also removes the phone's push token. */
export async function POST(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  await revokeParentToken(caller.tokenId, new Date().toISOString(), { tokens: parentTokenRepository });
  return new Response(null, { status: 204 });
}
