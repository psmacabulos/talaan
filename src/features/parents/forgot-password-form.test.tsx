import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  PARENT_RESET_SENT_MESSAGE,
  RESET_CODE_INVALID_MESSAGE,
  RESET_TOO_MANY_MESSAGE,
} from "@/features/auth/messages";

// The form imports Server Actions, which don't run in a unit test.
const requestParentPasswordReset = vi.fn();
const resetParentPassword = vi.fn();
vi.mock("./auth-actions", () => ({ requestParentPasswordReset, resetParentPassword }));

const { ParentForgotPasswordForm } = await import("./forgot-password-form");

const EMAIL = "Maria@example.com";

async function sendCode() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: EMAIL } });
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));
  await screen.findByLabelText("6-digit code");
}

function fillReset(code: string, password = "a-new-password-1", confirm = password) {
  fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: code } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
}

describe("ParentForgotPasswordForm (Step 55.6)", () => {
  beforeEach(() => {
    requestParentPasswordReset.mockReset();
    resetParentPassword.mockReset();
  });

  it("shows an inline error for an email that isn't one, and sends nothing", async () => {
    render(<ParentForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(requestParentPasswordReset).not.toHaveBeenCalled();
  });

  it("shows a refusal above the button and keeps the email", async () => {
    requestParentPasswordReset.mockResolvedValue({ ok: false, formError: RESET_TOO_MANY_MESSAGE });
    render(<ParentForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: EMAIL } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(RESET_TOO_MANY_MESSAGE);
    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  });

  it("moves to the code stage with the answer and the email, and focuses the code", async () => {
    requestParentPasswordReset.mockResolvedValue({ ok: true });
    render(<ParentForgotPasswordForm />);
    await sendCode();
    expect(screen.getByText(PARENT_RESET_SENT_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("6-digit code")).toHaveFocus());
    expect(screen.getByLabelText("6-digit code")).toHaveAttribute("autocomplete", "one-time-code");
    expect(screen.getByRole("button", { name: "Send a new code" })).toBeDisabled();
  });

  it("checks the code and the passwords inline before sending", async () => {
    requestParentPasswordReset.mockResolvedValue({ ok: true });
    render(<ParentForgotPasswordForm />);
    await sendCode();
    fillReset("12", "a-new-password-1", "something-else");
    expect(await screen.findByText("Enter the 6-digit code from the email")).toBeInTheDocument();
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    expect(resetParentPassword).not.toHaveBeenCalled();
  });

  it("sends the email with the code and keeps what was typed after a wrong code", async () => {
    requestParentPasswordReset.mockResolvedValue({ ok: true });
    resetParentPassword.mockResolvedValue({ ok: false, formError: RESET_CODE_INVALID_MESSAGE });
    render(<ParentForgotPasswordForm />);
    await sendCode();
    fillReset("482913");

    expect(await screen.findByRole("alert")).toHaveTextContent(RESET_CODE_INVALID_MESSAGE);
    expect(resetParentPassword).toHaveBeenCalledWith(EMAIL, {
      code: "482913",
      password: "a-new-password-1",
      confirmPassword: "a-new-password-1",
    });
    expect(screen.getByLabelText("6-digit code")).toHaveValue("482913");
    expect(screen.getByLabelText("New password")).toHaveValue("a-new-password-1");
  });

  it("goes back to the email stage with Use a different email", async () => {
    requestParentPasswordReset.mockResolvedValue({ ok: true });
    render(<ParentForgotPasswordForm />);
    await sendCode();
    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(await screen.findByRole("button", { name: "Send code" })).toBeInTheDocument();
  });
});
