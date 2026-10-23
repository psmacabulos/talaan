import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { LinkedGuardian, RemovedGuardian } from "@/features/parents/types";
import { schoolTimeToIso } from "@/lib/school-time";
import { LinkedParents, removedLine } from "./linked-parents";
import { allowParentLinkAgain, removeParentLink } from "./parent-link-actions";

// The Server Actions have their own rules (and the repository its tests);
// mocking them keeps next/cache and the database out of this component test.
vi.mock("./parent-link-actions", () => ({
  removeParentLink: vi.fn(async () => ({ ok: true })),
  allowParentLinkAgain: vi.fn(async () => ({ ok: true })),
}));

const ana: LinkedGuardian = {
  linkId: "link-1",
  studentId: "student-1",
  linkedAt: schoolTimeToIso("2026-10-22", "12:48"),
  parent: { firstName: "Ana", lastName: "Santos", mobile: "09170000001" },
};

const removedRosa: RemovedGuardian = {
  blockId: "block-1",
  studentId: "student-1",
  removedAt: schoolTimeToIso("2026-10-22", "14:00"),
  parent: { firstName: "Rosa", lastName: "Cruz" },
  removedBy: { firstName: "Catherine", lastName: "Jongco" },
};

describe("LinkedParents (Steps 55.3 and 55.4)", () => {
  it("lists each parent account with its mobile and the day it linked", () => {
    render(<LinkedParents childFirstName="Juan" guardians={[ana]} removed={[]} />);

    expect(screen.getByRole("heading", { name: "Parent accounts" })).toBeInTheDocument();
    expect(screen.getByText(/Parents who linked Juan in the Bantay Aral app/)).toBeInTheDocument();
    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Ana Santos");
    expect(row).toHaveTextContent("09170000001 · Linked October 22, 2026");
    expect(screen.queryByRole("heading", { name: "Removed" })).not.toBeInTheDocument();
  });

  it("says so when nobody has linked the child", () => {
    render(<LinkedParents childFirstName="Juan" guardians={[]} removed={[]} />);
    expect(screen.getByText("No parent has linked Juan in the app yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("asks before removing, says what happens, then removes that link", async () => {
    render(<LinkedParents childFirstName="Juan" guardians={[ana]} removed={[]} />);

    const button = screen.getByRole("button", { name: "Remove Ana Santos" });
    // Inside the student form: it must never submit it.
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);

    const dialog = screen.getByRole("dialog", { name: "Remove Ana Santos from Juan's parent accounts?" });
    expect(dialog).toHaveTextContent(
      "Ana Santos will stop seeing Juan's arrivals and getting notifications about Juan. They can't link Juan again unless you allow it.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(removeParentLink).toHaveBeenCalledWith("link-1"));
  });

  it("lists removed parents with who removed them, and allows one again", async () => {
    render(<LinkedParents childFirstName="Juan" guardians={[]} removed={[removedRosa]} />);

    expect(screen.getByRole("heading", { name: "Removed" })).toBeInTheDocument();
    expect(screen.getByText("Removed October 22, 2026 by Catherine Jongco")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Allow Rosa Cruz again" }));
    await waitFor(() => expect(allowParentLinkAgain).toHaveBeenCalledWith("block-1"));
  });

  it("names nobody once the staff member who removed them is gone", () => {
    expect(removedLine({ ...removedRosa, removedBy: null })).toBe(
      "Removed October 22, 2026 by a former staff member",
    );
  });
});
