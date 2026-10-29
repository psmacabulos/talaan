import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { schoolTimeToIso } from "@/lib/school-time";
import { TopbarClock } from "./topbar-clock";

// 9:15:30 AM at the school, Thursday, October 29, 2026.
const SERVER_NOW = new Date(Date.parse(schoolTimeToIso("2026-10-29", "09:15")) + 30_000).toISOString();

afterEach(() => {
  vi.useRealTimers();
});

describe("TopbarClock", () => {
  it("shows the server's time on the school's clock, short and long", () => {
    render(<TopbarClock serverNow={SERVER_NOW} pinned={false} />);
    expect(screen.getByText("Thu, Oct 29")).toBeInTheDocument();
    expect(screen.getByText("Thursday, October 29, 2026")).toBeInTheDocument();
    expect(screen.getByText("9:15 AM")).toBeInTheDocument();
  });

  it("moves on by the time passed on the device, even when the device's own clock is wrong", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    render(<TopbarClock serverNow={SERVER_NOW} pinned={false} />);

    act(() => vi.advanceTimersByTime(29_000));
    expect(screen.getByText("9:15 AM")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("9:16 AM")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("9:17 AM")).toBeInTheDocument();
  });

  it("stays still on a pinned demo clock", () => {
    vi.useFakeTimers();
    render(<TopbarClock serverNow={SERVER_NOW} pinned />);
    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(screen.getByText("9:15 AM")).toBeInTheDocument();
  });
});
