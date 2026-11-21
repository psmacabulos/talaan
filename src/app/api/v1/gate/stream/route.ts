import { formatSseEvent, SSE_KEEP_ALIVE } from "@/features/gate/sse";
import { resolveMonitorViewer } from "@/features/gate/monitor-viewer";
import { getNow } from "@/lib/clock";
import { markDeviceSeen } from "@/services/devices/mark-seen";
import { subscribeToTaps } from "@/services/taps/tap-events";

/** Under Heroku's 55-second limit for a silent connection. */
const KEEP_ALIVE_MS = 25_000;

/**
 * How often an open feed marks its monitor as seen (Step 59.12). Its own
 * timer, not the 25-second keep-alive, so a TV costs one small write every
 * 5 minutes, not a database call every 25 seconds.
 */
const SEEN_EVERY_MS = 5 * 60_000;

/**
 * The live feed behind `/gate/display` (Step 48): every newly stored tap at
 * the viewer's own school, as server-sent events. The school comes from the
 * monitor's cookie or the principal's session, never from the address.
 * A monitor's open feed also marks it as seen every 5 minutes (Step 59.12).
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

      // Only a monitor device is marked, never a principal watching from their own sign-in.
      const { deviceId } = viewer;
      const markSeen = () => {
        if (deviceId && !request.signal.aborted) void markDeviceSeen(deviceId, getNow());
      };
      markSeen();
      const seenTimer = deviceId ? setInterval(markSeen, SEEN_EVERY_MS) : null;

      // The TV or tab went away: stop listening, so nothing is left behind.
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        if (seenTimer) clearInterval(seenTimer);
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
