import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import { AttendanceCardList } from "./attendance-card-list";
import type { AttendanceRow } from "./attendance-table";
import { schoolToday } from "./status";
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

// 9:15 AM on the demo morning: past both cutoffs, so a student with no tap is absent.
const DAY = schoolToday(schoolTimeToIso("2026-06-19", "09:15"));

// Well before the 8:05 AM late cutoff.
const taps: Tap[] = [
  {
    id: "7b0d6f8e-4c1a-4f7e-9d7a-2f4b1c3e5a60",
    schoolId: "school-a",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: "student-juan",
    tappedAt: schoolTimeToIso("2026-06-19", "07:56"),
  },
];

function items(label: string) {
  return within(screen.getByRole("list", { name: label })).getAllByRole("listitem");
}

describe("AttendanceCardList", () => {
  it("shows the name, today's status and the time in, and no LRN or class", () => {
    render(<AttendanceCardList rows={[juan, carmen]} taps={taps} day={DAY} label="Students" />);

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
    render(<AttendanceCardList rows={[juan, carmen]} taps={taps} day={DAY} label="Students" />);

    const [first, second] = items("Students");
    expect(first).toHaveTextContent("In at 7:56 AM");
    expect(second).toHaveTextContent("No tap yet");
  });

  it("tags only a student whose card isn't linked", () => {
    render(<AttendanceCardList rows={[juan, carmen, pedro]} taps={taps} day={DAY} label="Students" />);

    const [first, second, third] = items("Students");
    expect(within(first).queryByText("Linked")).not.toBeInTheDocument();
    expect(within(second).getByText("No card")).toBeInTheDocument();
    expect(within(third).getByText("Lost")).toBeInTheDocument();
  });

  it("measures today against the date it's given", () => {
    render(
      <AttendanceCardList
        rows={[juan]}
        taps={taps}
        day={schoolToday(schoolTimeToIso("2026-06-22", "09:15"))}
        label="Students"
      />,
    );

    expect(screen.getByText("Absent")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("No tap yet");
  });

  it("names the list, so the class roll reads as its own list", () => {
    render(<AttendanceCardList rows={[juan]} taps={taps} day={DAY} label="Class roll" variant="rows" />);

    expect(items("Class roll")).toHaveLength(1);
  });

  describe("time in and the latest tap (Steps 49 and 59.3)", () => {
    const at = (time: string, n: number): Tap => ({
      id: `7b0d6f8e-4c1a-4f7e-9d7a-2f4b1c3e5a6${n}`,
      schoolId: "school-a",
      stationId: "station-main-gate",
      cardSerial: "04:A3:5F:2B:91:C0:80",
      studentId: "student-juan",
      tappedAt: schoolTimeToIso("2026-06-19", time),
    });

    it("shows In and Out after two taps, with no taps button", () => {
      render(<AttendanceCardList rows={[juan]} taps={[at("07:41", 1), at("08:40", 2)]} day={DAY} label="Students" />);
      const [item] = items("Students");
      expect(within(item).getByText("7:41 AM")).toBeInTheDocument();
      expect(within(item).getByText("8:40 AM").parentElement).toHaveTextContent(/^, out at Out 8:40 AM$/);
      expect(within(item).queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows Back in after in, out, in, and lists all three taps in a dialog", () => {
      render(
        <AttendanceCardList
          rows={[juan]}
          taps={[at("07:38", 1), at("08:20", 2), at("08:52", 3)]}
          day={DAY}
          label="Students"
        />,
      );
      const [item] = items("Students");
      // The newest tap, the time in after coming back (P-052); the out between shows only in the dialog.
      expect(within(item).getByText("8:52 AM").parentElement).toHaveTextContent(/^, back in at Back in 8:52 AM$/);
      expect(within(item).queryByText("8:20 AM")).not.toBeInTheDocument();

      fireEvent.click(within(item).getByRole("button", { name: /3 taps/ }));
      const dialog = screen.getByRole("dialog", { name: "Juan Cruz's taps" });
      expect(within(dialog).getByText("June 19, 2026")).toBeInTheDocument();
      const rows = within(dialog)
        .getAllByRole("listitem")
        .map((row) => row.textContent);
      expect(rows).toEqual(["1. In7:38 AM", "2. Out8:20 AM", "3. In8:52 AM"]);
    });

    it("offers a time out by hand on today's roll while the student is in, and never a back in (Step 59.4)", () => {
      const { rerender } = render(
        <AttendanceCardList rows={[juan]} taps={[at("07:41", 1)]} day={DAY} label="Students" canRecordByHand />,
      );
      expect(screen.getByRole("button", { name: "Record time out for Juan Cruz" })).toBeInTheDocument();

      rerender(
        <AttendanceCardList
          rows={[juan]}
          taps={[at("07:41", 1), at("08:40", 2)]}
          day={DAY}
          label="Students"
          canRecordByHand
        />,
      );
      expect(screen.queryByRole("button", { name: /^Record time/ })).not.toBeInTheDocument();

      // A past day's roll: nothing to record.
      rerender(<AttendanceCardList rows={[juan]} taps={[at("07:41", 1)]} day={DAY} label="Students" />);
      expect(screen.queryByRole("button", { name: /^Record time/ })).not.toBeInTheDocument();
    });

    it("says 'Recorded by staff' under a time out recorded by hand", () => {
      const byHand: Tap = { ...at("15:30", 2), source: "manual", recordedById: "staff-principal" };
      render(<AttendanceCardList rows={[juan]} taps={[at("07:41", 1), byHand]} day={DAY} label="Students" />);
      const [item] = items("Students");
      expect(within(item).getByText("Recorded by staff")).toBeInTheDocument();
    });
  });
});
