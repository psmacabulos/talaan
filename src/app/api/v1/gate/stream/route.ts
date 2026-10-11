import { formatSseEvent, SSE_KEEP_ALIVE } from "@/features/gate/sse";
import { resolveMonitorViewer } from "@/features/gate/monitor-viewer";
import { subscribeToTaps } from "@/services/taps/tap-events";

/** Under Heroku's 55-second limit for a silent connection. */
const KEEP_ALIVE_MS = 25_000;

/**
 * The live feed behind `/gate/display` (Step 48): every newly stored tap at
 * the viewer's own school, as server-sent events. The school comes from the
 * monitor's cookie or the principal's session, never from the address.
 */
export async function GET(request: Request) {
  const viewer = await resolveMonitorViewer();
  if (!viewer) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      const unsubscribe = subscribeToTaps(viewer.schoolId, (event) => send(formatSseEvent("tap", event)));
      const keepAlive = setInterval(() => send(SSE_KEEP_ALIVE), KEEP_ALIVE_MS);
      send(SSE_KEEP_ALIVE);

      // The TV or tab went away: stop listening, so nothing is left behind.
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed by the browser going away: nothing to do.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
