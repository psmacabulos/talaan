import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FORGOT_PASSWORD_MESSAGE } from "./messages";

// The form imports a Server Action, which doesn't run in a unit test.
vi.mock("./actions", () => ({ signIn: vi.fn() }));

const { LoginForm } = await import("./login-form");

describe("LoginForm", () => {
  it("'Forgot your password?' goes to the reset page when email works (Step 55.5)", () => {
    render(<LoginForm canResetByEmail />);
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByText(FORGOT_PASSWORD_MESSAGE)).not.toBeInTheDocument();
  });

  it("'Forgot your password?' says who to ask while a live server can't email, and hides it again", () => {
    render(<LoginForm canResetByEmail={false} />);
    const toggle = screen.getByRole("button", { name: /forgot your password/i });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(FORGOT_PASSWORD_MESSAGE)).not.toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(FORGOT_PASSWORD_MESSAGE)).toBeVisible();

    fireEvent.click(toggle);
    expect(screen.queryByText(FORGOT_PASSWORD_MESSAGE)).not.toBeVisible();
  });
});
