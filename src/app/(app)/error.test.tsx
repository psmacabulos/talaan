import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AppError from "./error";

describe("AppError", () => {
  it("shows a friendly message and the digest when present", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<AppError error={error} retry={vi.fn()} />);

    expect(screen.getByText("Something went wrong loading this page")).toBeInTheDocument();
    expect(screen.getByText(/Reference: abc123/)).toBeInTheDocument();
  });

  it("calls retry when the button is pressed", () => {
    const retry = vi.fn();
    render(<AppError error={new Error("boom")} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
