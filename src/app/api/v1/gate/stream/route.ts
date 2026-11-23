import { formatSseEvent, SSE_KEEP_ALIVE } from "@/features/gate/sse";
import { resolveMonitorViewer } from "@/features/gate/monitor-viewer";
import { getNow } from "@/lib/clock";
import { markDeviceSeen } from "@/services/devices/mark-seen";
import { isDeviceStillActive } from "@/services/devices/still-active";
import { subscribeToTaps } from "@/services/taps/tap-events";

/** Under Heroku's 55-second limit for a silent connection. */
const KEEP_ALIVE_MS = 25_000;

/**
 * How often an open feed marks its monitor as seen (Step 59.12) and checks
 * it is still enabled (Step 59.14). Its own timer, not the 25-second
 * keep-alive, so a TV costs one small write and one read by primary key
 * every 5 minutes, not a database call every 25 seconds. It is also the
 * longest a disabled monitor keeps showing taps.
 */
const SEEN_EVERY_MS = 5 * 60_000;

/**
 * The live feed behind `/gate/display` (Step 48): every newly stored tap at
 * the viewer's own school, as server-sent events. The school comes from the
 * monitor's cookie or the principal's session, never from the address.
 * A monitor's open feed also marks it as seen every 5 minutes (Step 59.12),
 * and ends if the office has disabled it by then (Step 59.14).
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

      // Stops everything this feed started, so nothing is left behind. Used
      // when the TV or tab goes away, and when the monitor is disabled.
      let seenTimer: ReturnType<typeof setInterval> | null = null;
      const end = () => {
        clearInterval(keepAlive);
        if (seenTimer) clearInterval(seenTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed by the browser going away: nothing to do.
        }
      };
      request.signal.addEventListener("abort", end);

      // Only a monitor device is marked and checked, never a principal watching from their own sign-in.
      const { deviceId } = viewer;
      if (deviceId) {
        void markDeviceSeen(deviceId, getNow());
        seenTimer = setInterval(() => {
          if (request.signal.aborted) return;
          void markDeviceSeen(deviceId, getNow());
          void isDeviceStillActive(deviceId).then((active) => {
            if (!active && !request.signal.aborted) end();
          });
        }, SEEN_EVERY_MS);
      }
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
