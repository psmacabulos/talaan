import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const deleteStudentAction = vi.fn();
vi.mock("./privacy-actions", () => ({
  deleteStudentAction: (...args: unknown[]) => deleteStudentAction(...args),
}));
vi.mock("sonner", () => ({ toast: vi.fn() }));

import { StudentPrivacySection } from "./student-privacy-section";
import type { Student } from "./types";

const juan: Student = {
  id: "student-1",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-04",
  gradeLevel: 7,
  section: "A",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

const FIELD = /Type .*Juan Dela Cruz.* to confirm/;

async function openDialog(onDeleted = vi.fn()) {
  render(<StudentPrivacySection student={juan} onDeleted={onDeleted} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete this student…" }));
  await screen.findByRole("dialog", { name: "Delete Juan Dela Cruz?" });
  return onDeleted;
}

const confirmButton = () => screen.getByRole("button", { name: "Delete everything" });

describe("StudentPrivacySection (Step 60.3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links the download to this student's file", () => {
    render(<StudentPrivacySection student={juan} onDeleted={vi.fn()} />);

    const link = screen.getByRole("link", { name: "Download Juan's data" });
    expect(link).toHaveAttribute("href", "/students/student-1/export");
    expect(link).toHaveAttribute("download");
  });

  it("says what goes and what stays, and keeps the button off until the name is typed", async () => {
    await openDialog();

    expect(screen.getByRole("dialog")).toHaveTextContent("can't be undone");
    expect(screen.getByRole("dialog")).toHaveTextContent("Parent accounts, other students");
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "juan" } });
    expect(confirmButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "  juan DELA cruz" } });
    expect(confirmButton()).toBeEnabled();
  });

  it("deletes with what was typed, then closes and tells the drawer", async () => {
    deleteStudentAction.mockResolvedValue({ ok: true });
    const onDeleted = await openDialog();

    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "Juan Dela Cruz" } });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteStudentAction).toHaveBeenCalledWith("student-1", "Juan Dela Cruz");
  });

  it("shows a refusal under the field and stays open, telling the drawer nothing", async () => {
    deleteStudentAction.mockResolvedValue({ ok: false, error: "That student was already deleted." });
    const onDeleted = await openDialog();

    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "Juan Dela Cruz" } });
    fireEvent.click(confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("That student was already deleted.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("does not press the drawer's Save when Enter submits the dialog's own form", async () => {
    deleteStudentAction.mockResolvedValue({ ok: true });
    const saved = vi.fn();
    render(
      <form onSubmit={saved}>
        <StudentPrivacySection student={juan} onDeleted={vi.fn()} />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete this student…" }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "Juan Dela Cruz" } });
    fireEvent.submit(screen.getByLabelText(FIELD).closest("form")!);

    await waitFor(() => expect(deleteStudentAction).toHaveBeenCalled());
    expect(saved).not.toHaveBeenCalled();
  });

  it("clears what was typed when cancelled", async () => {
    await openDialog();
    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "Juan" } });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Delete this student…" }));

    expect(await screen.findByLabelText(FIELD)).toHaveValue("");
  });
});
