// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MonitorViewer } from "@/features/gate/monitor-viewer";

const state = vi.hoisted(() => ({
  viewer: null as MonitorViewer | null,
  markDeviceSeen: vi.fn(),
}));

vi.mock("@/features/gate/monitor-viewer", () => ({ resolveMonitorViewer: async () => state.viewer }));
vi.mock("@/services/devices/mark-seen", () => ({ markDeviceSeen: state.markDeviceSeen }));
vi.mock("@/services/taps/tap-events", () => ({ subscribeToTaps: () => () => undefined }));
vi.mock("@/lib/clock", () => ({ getNow: () => "2026-06-19T01:15:00.000Z" }));

const { GET } = await import("./route");

const FIVE_MINUTES = 5 * 60_000;

async function open() {
  const controller = new AbortController();
  const response = await GET(new Request("http://localhost/api/v1/gate/stream", { signal: controller.signal }));
  return { controller, response };
}

describe("the monitor's live feed marks it as seen (Step 59.12)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.markDeviceSeen.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("marks a monitor on connect and every 5 minutes, and stops once it has gone", async () => {
    state.viewer = { schoolId: "school-a", kind: "monitor", deviceId: "monitor-a" };
    const { controller } = await open();
    expect(state.markDeviceSeen).toHaveBeenCalledTimes(1);
    expect(state.markDeviceSeen).toHaveBeenCalledWith("monitor-a", "2026-06-19T01:15:00.000Z");

    // The 25-second keep-alives in between write nothing.
    vi.advanceTimersByTime(FIVE_MINUTES - 1);
    expect(state.markDeviceSeen).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(state.markDeviceSeen).toHaveBeenCalledTimes(2);

    controller.abort();
    vi.advanceTimersByTime(3 * FIVE_MINUTES);
    expect(state.markDeviceSeen).toHaveBeenCalledTimes(2);
  });

  it("never marks anything for a principal watching from their own sign-in", async () => {
    state.viewer = { schoolId: "school-a", kind: "staff", deviceId: null };
    const { controller } = await open();
    vi.advanceTimersByTime(3 * FIVE_MINUTES);
    expect(state.markDeviceSeen).not.toHaveBeenCalled();
    controller.abort();
  });

  it("answers 404 with no viewer", async () => {
    state.viewer = null;
    const { response } = await open();
    expect(response.status).toBe(404);
    expect(state.markDeviceSeen).not.toHaveBeenCalled();
  });
});
