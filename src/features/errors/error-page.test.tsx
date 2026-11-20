import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { ErrorPage } from "./error-page";

const reporting = vi.hoisted(() => ({ reportBrowserError: vi.fn() }));

vi.mock("@/lib/browser-error-reporting", () => ({
  reportBrowserError: reporting.reportBrowserError,
  canSendProblemReports: () => false,
  sendBrowserProblemReport: vi.fn(),
}));

describe("ErrorPage", () => {
  beforeEach(() => {
    reporting.reportBrowserError.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("reports an ordinary error and offers Try again", () => {
    const error = new Error("Something broke");
    render(<ErrorPage error={error} retry={vi.fn()} showThemeToggle={false} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(reporting.reportBrowserError).toHaveBeenCalledWith(error, expect.any(String));
  });

  it("asks for a reload, and reports nothing, when the page is older than the deploy (P-062)", () => {
    const error = new UnrecognizedActionError('Server Action "4051d7b7" was not found on the server.');
    render(<ErrorPage error={error} retry={vi.fn()} showThemeToggle={false} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bantay Aral was updated");
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    expect(reporting.reportBrowserError).not.toHaveBeenCalled();
  });
});
