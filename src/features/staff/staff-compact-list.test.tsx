import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { StaffCompactList } from "./staff-compact-list";
import type { Staff } from "./types";

// Same reasoning as notifications-bell.test.tsx: the server actions have
// their own rules (row-actions.test.ts), and mocking them keeps next/cache
// and the mock repositories out of this pure rendering test.
vi.mock("./actions", () => ({
  resendStaffInvite: vi.fn(),
  removeStaff: vi.fn(),
}));

// Radix's dropdown content measures itself with ResizeObserver, which jsdom
// doesn't implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const principal: Staff = {
  id: "staff-principal",
  schoolId: "school-a",
  role: "principal",
  firstName: "Maria",
  lastName: "Ramos",
  email: "principal@school.example",
  status: "active",
};

const teacher: Staff = {
  id: "staff-teacher",
  schoolId: "school-a",
  role: "teacher",
  firstName: "Jose",
  lastName: "Pascual",
  email: "teacher@school.example",
  status: "invited",
  advisoryGradeLevel: 10,
  advisorySection: "Rizal",
};

function openMenu(name: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: `Actions for ${name}` }), { button: 0, ctrlKey: false });
}

describe("StaffCompactList", () => {
  it("shows each person as a name and what they do, without column labels", () => {
    render(<StaffCompactList items={[principal, teacher]} currentUserId="staff-principal" />);

    const rows = within(screen.getByRole("list", { name: "Staff" })).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("heading", { name: "Maria Ramos" })).toBeInTheDocument();
    expect(within(rows[0]).getByText("Principal")).toBeInTheDocument();
    // An advisory class implies the teacher role, so it isn't repeated.
    expect(within(rows[1]).getByText("Adviser, Grade 10 – Rizal")).toBeInTheDocument();
    expect(screen.queryByText("Role")).not.toBeInTheDocument();
  });

  it("shows a teacher's role when there's no advisory class", () => {
    render(<StaffCompactList items={[{ ...teacher, advisoryGradeLevel: undefined, advisorySection: undefined }]} currentUserId="x" />);
    expect(screen.getByText("Teacher")).toBeInTheDocument();
  });

  it("flags only a pending invite, not an active account", () => {
    render(<StaffCompactList items={[principal, teacher]} currentUserId="staff-principal" />);
    expect(screen.getByText("Invited")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("keeps the email in the ⋮ menu, with resend and remove for a pending invite", () => {
    render(<StaffCompactList items={[teacher]} currentUserId="staff-principal" />);
    expect(screen.queryByText("teacher@school.example")).not.toBeInTheDocument();
    openMenu("Jose Pascual");

    expect(screen.getByText("teacher@school.example")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Resend invitation" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remove" })).toBeInTheDocument();
  });

  it("has no menu on the signed-in person's own, already accepted, account", () => {
    render(<StaffCompactList items={[principal]} currentUserId="staff-principal" />);
    expect(screen.queryByRole("button", { name: "Actions for Maria Ramos" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before removing", () => {
    render(<StaffCompactList items={[teacher]} currentUserId="staff-principal" />);
    openMenu("Jose Pascual");
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove" }));

    expect(screen.getByRole("dialog", { name: "Remove Jose Pascual?" })).toBeInTheDocument();
  });
});
