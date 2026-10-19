import { gateTapRequestSchema } from "@/features/gate/schemas";
import { toGateTapResponse } from "@/features/gate/responses";
import { getNow } from "@/lib/clock";
import { authenticateGate } from "@/services/devices/authenticate-gate";
import { wakePushWorker } from "@/services/push/push-worker";
import { publishStoredTap } from "@/services/taps/publish-tap";
import { recordTap } from "@/services/taps/record-tap";

/**
 * One tap from a gate (Step 46). Thin on purpose: check the token, check
 * the body's shape, hand it to `recordTap()` (docs/GATE.md), and send back
 * what the screen needs. Every decision about the tap lives in the service.
 */
export async function POST(request: Request) {
  const auth = await authenticateGate(request.headers.get("authorization"));
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body isn't JSON." }, { status: 400 });
  }

  const parsed = gateTapRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "That isn't a valid tap.", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await recordTap({
    device: auth.device,
    clientTapId: parsed.data.clientTapId,
    rawSerial: parsed.data.cardSerial,
    clientTappedAt: parsed.data.clientTappedAt,
    receivedAt: getNow(),
  });

  // Every open guardhouse monitor of this school sees a new tap or an unknown card (Step 48).
  await publishStoredTap(result);
  // Its notification, already written with the tap, is pushed to the parents' phones now (Step 54).
  if (result.outcome === "recorded" && result.notified && !result.replayed) wakePushWorker();
  return Response.json(toGateTapResponse(result));
}
