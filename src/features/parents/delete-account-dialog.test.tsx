import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const deleteMyAccount = vi.fn();
vi.mock("./auth-actions", () => ({ deleteMyAccount: (password: string) => deleteMyAccount(password) }));

import { DeleteAccountDialog } from "./delete-account-dialog";

const PASSWORD_LABEL = "Enter your password to confirm";

async function openDialog() {
  render(<DeleteAccountDialog />);
  fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  return screen.findByRole("dialog", { name: "Delete your account?" });
}

/** The dialog's own confirm button: the page's trigger of the same name is hidden while it's open. */
function confirmButton() {
  return screen.getAllByRole("button", { name: "Delete my account", hidden: true }).at(-1)!;
}

describe("DeleteAccountDialog (Step 60.2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says what goes and what stays, and keeps the button off until a password is typed", async () => {
    const dialog = await openDialog();

    expect(dialog).toHaveTextContent("can't be undone");
    expect(dialog).toHaveTextContent("school records stay with the school");
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText(PASSWORD_LABEL), { target: { value: "x" } });
    expect(confirmButton()).toBeEnabled();
  });

  it("sends the password, and shows a wrong one under the field without closing", async () => {
    deleteMyAccount.mockResolvedValue({ ok: false, formError: "That password isn't right." });
    await openDialog();

    fireEvent.change(screen.getByLabelText(PASSWORD_LABEL), { target: { value: "wrong-one" } });
    fireEvent.click(confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("That password isn't right.");
    expect(deleteMyAccount).toHaveBeenCalledWith("wrong-one");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(PASSWORD_LABEL)).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the password and the message when it's cancelled", async () => {
    deleteMyAccount.mockResolvedValue({ ok: false, formError: "That password isn't right." });
    await openDialog();
    fireEvent.change(screen.getByLabelText(PASSWORD_LABEL), { target: { value: "x" } });
    fireEvent.click(confirmButton());
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByLabelText(PASSWORD_LABEL)).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
