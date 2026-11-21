import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const { GateMonitor } = await import("./gate-monitor");

class FakeEventSource {
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
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
