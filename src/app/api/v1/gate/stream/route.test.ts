// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MonitorViewer } from "@/features/gate/monitor-viewer";

const state = vi.hoisted(() => ({
  viewer: null as MonitorViewer | null,
  markDeviceSeen: vi.fn(),
  isDeviceStillActive: vi.fn(),
}));

vi.mock("@/features/gate/monitor-viewer", () => ({ resolveMonitorViewer: async () => state.viewer }));
vi.mock("@/services/devices/mark-seen", () => ({ markDeviceSeen: state.markDeviceSeen }));
vi.mock("@/services/devices/still-active", () => ({ isDeviceStillActive: state.isDeviceStillActive }));
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
    state.isDeviceStillActive.mockReset().mockResolvedValue(true);
  });
  afterEach(() => vi.useRealTimers());

  it("marks a monitor on connect and every 5 minutes, and stops once it has gone", async () => {
    state.viewer = { schoolId: "school-a", kind: "monitor", deviceId: "monitor-a", deviceLabel: "Guardhouse" };
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
    state.viewer = { schoolId: "school-a", kind: "staff", deviceId: null, deviceLabel: null };
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

/** Reads the feed to its end: true when the server closed it, false while it was still open after `reads` chunks. */
async function endsWithin(response: Response, reads: number): Promise<boolean> {
  const reader = response.body!.getReader();
  for (let i = 0; i < reads; i++) {
    const { done } = await reader.read();
    if (done) return true;
  }
  return false;
}

describe("the monitor's live feed ends when the monitor is disabled (Step 59.14)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.markDeviceSeen.mockReset().mockResolvedValue(undefined);
    state.isDeviceStillActive.mockReset().mockResolvedValue(true);
    state.viewer = { schoolId: "school-a", kind: "monitor", deviceId: "monitor-a", deviceLabel: "Guardhouse" };
  });
  afterEach(() => vi.useRealTimers());

  it("checks once every 5 minutes and keeps the feed open while the monitor is enabled", async () => {
    const { controller, response } = await open();
    expect(state.isDeviceStillActive).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(FIVE_MINUTES);
    expect(state.isDeviceStillActive).toHaveBeenCalledTimes(1);
    expect(state.isDeviceStillActive).toHaveBeenCalledWith("monitor-a");
    // The first chunk is the opening keep-alive: the feed is still open.
    expect(await endsWithin(response, 1)).toBe(false);
    controller.abort();
  });

  it("closes the feed, and stops its timers, once the monitor is disabled", async () => {
    state.isDeviceStillActive.mockResolvedValue(false);
    const { response } = await open();

    await vi.advanceTimersByTimeAsync(FIVE_MINUTES);
    expect(await endsWithin(response, 100)).toBe(true);

    await vi.advanceTimersByTimeAsync(3 * FIVE_MINUTES);
    expect(state.isDeviceStillActive).toHaveBeenCalledTimes(1);
    expect(state.markDeviceSeen).toHaveBeenCalledTimes(2);
  });

  it("never checks a principal's own feed", async () => {
    state.viewer = { schoolId: "school-a", kind: "staff", deviceId: null, deviceLabel: null };
    const { controller } = await open();
    await vi.advanceTimersByTimeAsync(3 * FIVE_MINUTES);
    expect(state.isDeviceStillActive).not.toHaveBeenCalled();
    controller.abort();
  });
});
