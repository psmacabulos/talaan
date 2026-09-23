import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Tap } from "@/features/attendance/types";
import type { StudentRow } from "./search-students";
import { StudentsCardList } from "./students-card-list";

const reynaldo: StudentRow = {
  student: {
    id: "student-reynaldo",
    schoolId: "school-a",
    firstName: "Reynaldo",
    lastName: "Abad",
    birthDate: "2009-03-14",
    lrn: "123456789012",
    gradeLevel: 12,
    section: "Silang",
    guardianName: "Liza Abad",
    guardianMobile: "09171234567",
  },
  cardStatus: "active",
  cards: [],
};

const rosa: StudentRow = {
  student: {
    id: "student-rosa",
    schoolId: "school-a",
    firstName: "Rosa",
    lastName: "Castillo",
    birthDate: "2013-01-02",
    gradeLevel: 8,
    section: "Bonifacio",
    guardianName: "Ana Castillo",
    guardianMobile: "09181234567",
  },
  cardStatus: "none",
  cards: [],
};

// Same date as DASHBOARD_NOW, well before the 8:05 AM late cutoff.
const taps: Tap[] = [
  {
    id: "7b0d6f8e-4c1a-4f7e-9d7a-2f4b1c3e5a60",
    schoolId: "school-a",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: "student-reynaldo",
    tappedAt: "2026-06-20T07:12:00Z",
  },
];

function cards() {
  return within(screen.getByRole("list", { name: "Students" })).getAllByRole("listitem");
}

describe("StudentsCardList", () => {
  it("shows the name, grade and section, and today's status, and nothing more personal", () => {
    render(<StudentsCardList items={[reynaldo, rosa]} taps={taps} subtitle="grade" />);

    const [first, second] = cards();
    expect(within(first).getByRole("heading", { name: "Reynaldo Abad" })).toBeInTheDocument();
    expect(within(first).getByText("Grade 12 – Silang")).toBeInTheDocument();
    expect(within(first).getByText("Present")).toBeInTheDocument();
    expect(within(second).getByText("Absent")).toBeInTheDocument();
    // LRN, age and guardian stay in the edit drawer.
    expect(screen.queryByText(/123456789012/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Age/)).not.toBeInTheDocument();
    expect(screen.queryByText("Liza Abad")).not.toBeInTheDocument();
  });

  it("tags the card only when it isn't linked", () => {
    render(<StudentsCardList items={[reynaldo, rosa]} taps={taps} subtitle="grade" />);

    const [first, second] = cards();
    expect(within(first).queryByText("Linked")).not.toBeInTheDocument();
    expect(within(second).getByText("No card")).toBeInTheDocument();
  });

  it("shows a teacher today's time in instead of their own class on every card", () => {
    render(<StudentsCardList items={[reynaldo, rosa]} taps={taps} subtitle="time-in" />);

    const [first, second] = cards();
    expect(within(first).getByText("In at 7:12 AM")).toBeInTheDocument();
    expect(within(second).getByText("No tap yet")).toBeInTheDocument();
    expect(screen.queryByText(/Grade 12/)).not.toBeInTheDocument();
  });

  it("opens the student when their card is tapped", () => {
    const onCardClick = vi.fn();
    render(<StudentsCardList items={[reynaldo]} taps={taps} subtitle="grade" onCardClick={onCardClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Reynaldo Abad" }));
    expect(onCardClick).toHaveBeenCalledWith(reynaldo);
  });

  it("isn't clickable for someone who can't edit", () => {
    render(<StudentsCardList items={[reynaldo]} taps={taps} subtitle="time-in" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
