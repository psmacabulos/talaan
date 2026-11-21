import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const addDevice = vi.fn();
vi.mock("./actions", () => ({ addDevice: (input: unknown) => addDevice(input) }));
vi.mock("qrcode", () => ({ default: { toDataURL: async () => "data:image/png;base64,AAAA" } }));

import { AddDeviceButtons } from "./add-device-buttons";

const GATE = { ok: true, kind: "gate", label: "Main gate", secret: "tal_dev_KEY", gatePage: "https://bantayaral.test/gate" };
const MONITOR = {
  ok: true,
  kind: "monitor",
  label: "Guardhouse",
  secret: "https://bantayaral.test/gate/display/connect?key=tal_dev_KEY",
  gatePage: "https://bantayaral.test/gate",
};

async function create(buttonName: string, name: string) {
  render(<AddDeviceButtons />);
  fireEvent.click(screen.getByRole("button", { name: buttonName }));
  fireEvent.change(await screen.findByLabelText("Device name"), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Create device" }));
}

describe("Add gate and Add monitor (Step 59.13)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for a name, and checks it before sending anything", async () => {
    render(<AddDeviceButtons />);
    fireEvent.click(screen.getByRole("button", { name: "Add gate" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create device" }));

    expect(await screen.findByText("Enter a name for this device")).toBeInTheDocument();
    expect(addDevice).not.toHaveBeenCalled();
  });

  it("shows the gate's key once, with the next steps", async () => {
    addDevice.mockResolvedValue(GATE);
    await create("Add gate", "Main gate");

    expect(await screen.findByText("Gate tablet added")).toBeInTheDocument();
    expect(addDevice).toHaveBeenCalledWith({ kind: "gate", label: "Main gate" });
    expect(screen.getByLabelText("Secret key")).toHaveValue("tal_dev_KEY");
    expect(screen.getByText("This is the only time it will be shown.")).toBeInTheDocument();
    expect(screen.getByText("bantayaral.test/gate")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
  });

  it("shows a monitor's link with a QR code", async () => {
    addDevice.mockResolvedValue(MONITOR);
    await create("Add monitor", "Guardhouse");

    expect(await screen.findByText("Monitor added")).toBeInTheDocument();
    expect(screen.getByLabelText("Link")).toHaveValue(MONITOR.secret);
    expect(await screen.findByRole("img", { name: "QR code of the monitor link" })).toBeInTheDocument();
  });

  it("ignores Escape while the secret is shown, and forgets it once closed", async () => {
    addDevice.mockResolvedValue(GATE);
    await create("Add gate", "Main gate");
    await screen.findByText("Gate tablet added");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByLabelText("Secret key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByLabelText("Secret key")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Add gate" }));
    expect(await screen.findByLabelText("Device name")).toHaveValue("");
    expect(screen.queryByDisplayValue("tal_dev_KEY")).not.toBeInTheDocument();
  });

  it("puts a refused name beside the field and keeps the dialog open", async () => {
    addDevice.mockResolvedValue({ ok: false, fieldError: "A device with this name already exists at your school. Choose a different name." });
    await create("Add gate", "Main gate");

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists at your school");
    expect(screen.queryByText("Gate tablet added")).not.toBeInTheDocument();
  });
});
