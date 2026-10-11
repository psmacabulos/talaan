import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import type { AttendanceRow } from "./attendance-table";
import { ClassRoll } from "./class-roll";
import { schoolToday } from "./status";
import type { Tap } from "./types";

function student(id: string, firstName: string, lastName: string): Student {
  return {
    id,
    schoolId: "school-a",
    firstName,
    lastName,
    birthDate: "2013-01-02",
    gradeLevel: 7,
    section: "Rizal",
    guardianName: "Ana Cruz",
    guardianMobile: "09181234567",
  };
}

const juan: AttendanceRow = { student: student("student-juan", "Juan", "Cruz"), cardStatus: "active" };
const carmen: AttendanceRow = { student: student("student-carmen", "Carmen", "Sison"), cardStatus: "active" };
const rosa: AttendanceRow = { student: student("student-rosa", "Rosa", "Castillo"), cardStatus: "none" };
const pedro: AttendanceRow = { student: student("student-pedro", "Pedro", "Bernardo"), cardStatus: "lost" };

// 9:15 AM on the demo morning.
const DAY = schoolToday(schoolTimeToIso("2026-06-20", "09:15"));

const taps: Tap[] = [
  {
    id: "7b0d6f8e-4c1a-4f7e-9d7a-2f4b1c3e5a60",
    schoolId: "school-a",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: "student-juan",
    tappedAt: schoolTimeToIso("2026-06-20", "07:56"),
  },
];

describe("ClassRoll's desktop table", () => {
  it("says why a student can't tap in with the same tag as every other list", () => {
    render(<ClassRoll rows={[juan, carmen, rosa, pedro]} taps={taps} day={DAY} />);

    // Both views are in the markup (CSS picks one); this is the table's.
    const [, juanRow, carmenRow, rosaRow, pedroRow] = within(
      screen.getByRole("region", { name: "Class roll" }),
    ).getAllByRole("row");
    expect(within(juanRow).getByText("In at 7:56 AM")).toBeInTheDocument();
    expect(within(carmenRow).getByText("No tap yet")).toBeInTheDocument();
    expect(within(rosaRow).getByText("No card")).toBeInTheDocument();
    expect(within(pedroRow).getByText("Lost")).toBeInTheDocument();
    expect(screen.queryByText("No ID card linked yet")).not.toBeInTheDocument();
  });
});
