import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RESET_SENT_MESSAGE, RESET_TOO_MANY_MESSAGE } from "./messages";

// The form imports a Server Action, which doesn't run in a unit test.
const requestPasswordReset = vi.fn();
vi.mock("./actions", () => ({ requestPasswordReset }));

const { ForgotPasswordForm } = await import("./forgot-password-form");

function send(email: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

describe("ForgotPasswordForm (Step 55.5)", () => {
  beforeEach(() => {
    requestPasswordReset.mockReset();
  });

  it("shows an inline error for an email that isn't one, and sends nothing", async () => {
    render(<ForgotPasswordForm />);
    send("not-an-email");
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("answers with the email typed, focuses the answer, and brings the form back on Send again", async () => {
    requestPasswordReset.mockResolvedValue({ ok: true });
    render(<ForgotPasswordForm />);
    send(" Ana.Reyes@school.example ");

    const answer = await screen.findByRole("status");
    expect(answer).toHaveTextContent(RESET_SENT_MESSAGE);
    expect(answer).toHaveTextContent("Ana.Reyes@school.example");
    await waitFor(() => expect(answer).toHaveFocus());
    // An email field drops the spaces itself; the server lowercases.
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: "Ana.Reyes@school.example" });

    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    const field = screen.getByLabelText("Email");
    expect(field).toHaveValue("Ana.Reyes@school.example");
    await waitFor(() => expect(field).toHaveFocus());
  });

  it("shows a refusal above the button and keeps the email", async () => {
    requestPasswordReset.mockResolvedValue({ ok: false, formError: RESET_TOO_MANY_MESSAGE });
    render(<ForgotPasswordForm />);
    send("ana.reyes@school.example");

    expect(await screen.findByRole("alert")).toHaveTextContent(RESET_TOO_MANY_MESSAGE);
    expect(screen.getByLabelText("Email")).toHaveValue("ana.reyes@school.example");
  });
});
