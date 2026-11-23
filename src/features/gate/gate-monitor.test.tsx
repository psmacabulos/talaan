import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { GateMonitor } = await import("./gate-monitor");

class FakeEventSource {
  static readonly CLOSED = 2;
  static last: FakeEventSource | null = null;
  readyState = 1;
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  constructor() {
    FakeEventSource.last = this;
  }
  addEventListener() {}
  close() {}
}

describe("GateMonitor header (Step 59.13)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", FakeEventSource);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("names the monitor device and its school", () => {
    render(<GateMonitor schoolName="Balanga City NSHS" deviceLabel="office" loaded={[]} />);
    expect(screen.getByText("office · Balanga City NSHS")).toBeInTheDocument();
  });

  it("shows only the school when a principal watches from their own sign-in", () => {
    render(<GateMonitor schoolName="Balanga City NSHS" deviceLabel={null} loaded={[]} />);
    expect(screen.getByText("Balanga City NSHS")).toBeInTheDocument();
  });
});

describe("GateMonitor when its feed is refused for good (Step 59.14)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", FakeEventSource);
    refresh.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reloads the page when the browser gives up on the feed, so it can say the screen isn't connected", () => {
    render(<GateMonitor schoolName="Balanga City NSHS" deviceLabel="office" loaded={[]} />);
    const source = FakeEventSource.last!;
    source.readyState = FakeEventSource.CLOSED;
    act(() => source.onerror?.());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("only says reconnecting, and doesn't reload, while the browser is still retrying", () => {
    render(<GateMonitor schoolName="Balanga City NSHS" deviceLabel="office" loaded={[]} />);
    const source = FakeEventSource.last!;
    source.readyState = 0;
    act(() => source.onerror?.());
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting");
  });
});
