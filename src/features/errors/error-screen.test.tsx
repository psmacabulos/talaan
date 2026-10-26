import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ErrorScreen } from "./error-screen";
import { NOTE_MAX_LENGTH } from "./report-problem-dialog";

function renderScreen(props: Partial<Parameters<typeof ErrorScreen>[0]> = {}) {
  const onRetry = vi.fn();
  render(<ErrorScreen reference="3f9a1c2b" onRetry={onRetry} showThemeToggle={false} {...props} />);
  return { onRetry };
}

function openReport() {
  fireEvent.click(screen.getByRole("button", { name: "Report this problem" }));
  return screen.getByRole("dialog");
}

describe("ErrorScreen (Step 59.1)", () => {
  it("says what happened and shows the reference code", () => {
    renderScreen();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
    expect(screen.getByText("3f9a1c2b")).toBeInTheDocument();
  });

  it("hides the reference box when there's no code", () => {
    renderScreen({ reference: undefined });
    expect(screen.queryByText("Reference code")).not.toBeInTheDocument();
  });

  it("copies the reference code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderScreen();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy reference code" })));

    expect(writeText).toHaveBeenCalledWith("3f9a1c2b");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("calls retry when Try again is pressed", () => {
    const { onRetry } = renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("has no Report button when there's nowhere to send a report", () => {
    renderScreen();
    expect(screen.queryByRole("button", { name: "Report this problem" })).not.toBeInTheDocument();
  });

  it("sends the note, then says thanks", async () => {
    const onReport = vi.fn().mockResolvedValue(undefined);
    renderScreen({ onReport });
    openReport();

    fireEvent.change(screen.getByLabelText("What were you doing? (optional)"), {
      target: { value: "Opening the students list" },
    });
    expect(screen.getByText(`25/${NOTE_MAX_LENGTH}`)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));

    expect(onReport).toHaveBeenCalledWith("Opening the students list");
    expect(screen.getByRole("heading", { name: "Thanks, we got it" })).toBeInTheDocument();
  });

  it("shows Sending… and disables the form while it sends", () => {
    renderScreen({ onReport: () => new Promise<void>(() => undefined) });
    openReport();

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByLabelText("What were you doing? (optional)")).toBeDisabled();
  });

  it("says when sending failed, and keeps the note for another try", async () => {
    const onReport = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    renderScreen({ onReport });
    openReport();
    fireEvent.change(screen.getByLabelText("What were you doing? (optional)"), { target: { value: "At the gate" } });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
    expect(screen.getByRole("heading", { name: "Could not send the report" })).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(onReport).toHaveBeenLastCalledWith("At the gate");
    expect(screen.getByRole("heading", { name: "Thanks, we got it" })).toBeInTheDocument();
  });

  it("keeps a failed note when the dialog is closed and opened again", async () => {
    renderScreen({ onReport: vi.fn().mockRejectedValue(new Error("offline")) });
    openReport();
    fireEvent.change(screen.getByLabelText("What were you doing? (optional)"), { target: { value: "At the gate" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    openReport();

    expect(screen.getByLabelText("What were you doing? (optional)")).toHaveValue("At the gate");
  });

  it("limits the note's length", () => {
    renderScreen({ onReport: vi.fn() });
    openReport();
    expect(screen.getByLabelText("What were you doing? (optional)")).toHaveAttribute(
      "maxLength",
      String(NOTE_MAX_LENGTH),
    );
  });
});
