import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const disableDevice = vi.fn();
const enableDevice = vi.fn();
vi.mock("./actions", () => ({
  disableDevice: (id: string) => disableDevice(id),
  enableDevice: (id: string) => enableDevice(id),
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

// Radix's dropdown content measures itself with ResizeObserver, which jsdom doesn't implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

import { DeviceRowMenu } from "./device-row-menu";
import type { Device } from "./types";

const gate: Device = {
  id: "d1",
  schoolId: "school-a",
  label: "Main gate",
  kind: "gate",
  status: "active",
  lastSeenAt: null,
};
const monitor: Device = { ...gate, id: "d2", label: "Guardhouse TV", kind: "monitor" };

function openMenu(name: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: `Actions for ${name}` }), { button: 0, ctrlKey: false });
}

describe("DeviceRowMenu (Step 59.14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disableDevice.mockResolvedValue({ ok: true });
    enableDevice.mockResolvedValue({ ok: true });
  });

  it("offers Disable for an enabled device, and asks before doing it", () => {
    render(<DeviceRowMenu device={gate} onlyEnabledGate={false} />);
    openMenu("Main gate");
    fireEvent.click(screen.getByRole("menuitem", { name: "Disable device" }));

    expect(screen.getByRole("dialog", { name: "Disable Main gate?" })).toBeInTheDocument();
    expect(screen.getByText(/stops recording taps right away/)).toBeInTheDocument();
    expect(disableDevice).not.toHaveBeenCalled();
  });

  it("disables only after the confirmation, for that device", async () => {
    render(<DeviceRowMenu device={gate} onlyEnabledGate={false} />);
    openMenu("Main gate");
    fireEvent.click(screen.getByRole("menuitem", { name: "Disable device" }));
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() => expect(disableDevice).toHaveBeenCalledWith("d1"));
  });

  it("cancelling changes nothing", () => {
    render(<DeviceRowMenu device={gate} onlyEnabledGate={false} />);
    openMenu("Main gate");
    fireEvent.click(screen.getByRole("menuitem", { name: "Disable device" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(disableDevice).not.toHaveBeenCalled();
  });

  it("says what disabling does to a monitor, in its own words", () => {
    render(<DeviceRowMenu device={monitor} onlyEnabledGate={false} />);
    openMenu("Guardhouse TV");
    fireEvent.click(screen.getByRole("menuitem", { name: "Disable device" }));

    expect(screen.getByText(/stops showing taps within about 5 minutes/)).toBeInTheDocument();
  });

  it("warns, without blocking, when it's the school's only enabled gate", () => {
    render(<DeviceRowMenu device={gate} onlyEnabledGate />);
    openMenu("Main gate");
    fireEvent.click(screen.getByRole("menuitem", { name: "Disable device" }));

    expect(screen.getByRole("alert")).toHaveTextContent("only enabled gate");
    expect(screen.getByRole("button", { name: "Disable" })).toBeEnabled();
  });

  it("offers Enable for a disabled device, and does it at once with no question", async () => {
    render(<DeviceRowMenu device={{ ...gate, status: "revoked" }} onlyEnabledGate={false} />);
    openMenu("Main gate");
    expect(screen.queryByRole("menuitem", { name: "Disable device" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Enable device" }));

    await waitFor(() => expect(enableDevice).toHaveBeenCalledWith("d1"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
