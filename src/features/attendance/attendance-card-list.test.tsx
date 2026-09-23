import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Student } from "@/features/students/types";
import { AttendanceCardList } from "./attendance-card-list";
import type { AttendanceRow } from "./attendance-table";
import type { Tap } from "./types";

function student(id: string, firstName: string, lastName: string, lrn?: string): Student {
  return {
    id,
    schoolId: "school-a",
    firstName,
    lastName,
    birthDate: "2013-01-02",
    lrn,
    gradeLevel: 7,
    section: "Rizal",
    guardianName: "Ana Cruz",
    guardianMobile: "09181234567",
  };
}

const juan: AttendanceRow = { student: student("student-juan", "Juan", "Cruz", "100000000001"), cardStatus: "active" };
const carmen: AttendanceRow = { student: student("student-carmen", "Carmen", "Sison"), cardStatus: "none" };
const pedro: AttendanceRow = { student: student("student-pedro", "Pedro", "Bernardo"), cardStatus: "lost" };

// Same date as DASHBOARD_NOW, well before the 8:05 AM late cutoff.
const taps: Tap[] = [
  {
    id: "7b0d6f8e-4c1a-4f7e-9d7a-2f4b1c3e5a60",
    schoolId: "school-a",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: "student-juan",
    tappedAt: "2026-06-20T07:56:00Z",
  },
];

function items(label: string) {
  return within(screen.getByRole("list", { name: label })).getAllByRole("listitem");
}

describe("AttendanceCardList", () => {
  it("shows the name, today's status and the time in, and no LRN or class", () => {
    render(<AttendanceCardList rows={[juan, carmen]} taps={taps} label="Students" />);

    const [first, second] = items("Students");
    expect(within(first).getByRole("heading", { name: "Juan Cruz" })).toBeInTheDocument();
    expect(within(first).getByText("Present")).toBeInTheDocument();
    expect(within(first).getByText("7:56 AM")).toBeInTheDocument();
    expect(within(second).getByText("Absent")).toBeInTheDocument();
    // Students are minors: the LRN and the (shared) class stay off the card.
    expect(screen.queryByText(/100000000001/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rizal/)).not.toBeInTheDocument();
  });

  it("says why there's no time in to a screen reader, not just a dash", () => {
    render(<AttendanceCardList rows={[juan, carmen]} taps={taps} label="Students" />);

    const [first, second] = items("Students");
    expect(first).toHaveTextContent("In at 7:56 AM");
    expect(second).toHaveTextContent("No tap yet");
  });

  it("tags only a student whose card isn't linked", () => {
    render(<AttendanceCardList rows={[juan, carmen, pedro]} taps={taps} label="Students" />);

    const [first, second, third] = items("Students");
    expect(within(first).queryByText("Linked")).not.toBeInTheDocument();
    expect(within(second).getByText("No card")).toBeInTheDocument();
    expect(within(third).getByText("Lost")).toBeInTheDocument();
  });

  it("measures today against the date it's given", () => {
    render(<AttendanceCardList rows={[juan]} taps={taps} now="2026-06-21T09:15:00Z" label="Students" />);

    expect(screen.getByText("Absent")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("No tap yet");
  });

  it("names the list, so the class roll reads as its own list", () => {
    render(<AttendanceCardList rows={[juan]} taps={taps} label="Class roll" variant="rows" />);

    expect(items("Class roll")).toHaveLength(1);
  });
});
