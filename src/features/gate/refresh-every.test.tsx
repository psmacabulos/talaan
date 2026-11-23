import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { RefreshEvery } = await import("./refresh-every");

describe("RefreshEvery (Step 59.14)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("reloads the page's data every interval, and stops when the page goes", () => {
    const { unmount } = render(<RefreshEvery seconds={60} />);
    vi.advanceTimersByTime(59_000);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    unmount();
    vi.advanceTimersByTime(180_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
