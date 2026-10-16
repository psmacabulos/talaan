import { parentTokenRepository, pushTokenRepository } from "@/data/repositories";
import { requireParent } from "@/features/parents/api-request";
import { signOutParentPhone } from "@/services/parents/push-tokens";

/** Signs this phone out (Steps 53.3 and 53.4): its push address is removed, and its token stops working at once. */
export async function POST(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  await signOutParentPhone(caller.tokenId, new Date().toISOString(), {
    tokens: parentTokenRepository,
    pushTokens: pushTokenRepository,
  });
  return new Response(null, { status: 204 });
}
