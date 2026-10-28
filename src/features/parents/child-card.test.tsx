import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { schoolDayFor } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import type { ChildToday } from "@/services/parents/children-today";
import { ChildCard } from "./child-card";

const FRIDAY = "2026-06-19";

const katrina: Student = {
  id: "student-0037",
  schoolId: "school-oceanview",
  firstName: "Katrina",
  lastName: "Aguilar",
  birthDate: "2012-03-14",
  gradeLevel: 7,
  section: "Rizal",
  guardianName: "Maria Aguilar",
  guardianMobile: "09171234567",
};

function tapAt(n: number, time: string): Tap {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    schoolId: katrina.schoolId,
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: katrina.id,
    tappedAt: schoolTimeToIso(FRIDAY, time),
  };
}

function child(times: string[]): ChildToday {
  return {
    student: katrina,
    school: null,
    day: schoolDayFor(FRIDAY, schoolTimeToIso(FRIDAY, "18:00")),
    todayTaps: times.map((time, n) => tapAt(n, time)),
    recentTaps: [],
  };
}

/** The tile beside a label: the coloured square before its words. */
function tileBeside(label: string) {
  return screen.getByText(label).closest("div")!.querySelector("[aria-hidden='true']")!;
}

describe("ChildCard", () => {
  it("is one link, named for the child, to their day", () => {
    render(<ChildCard child={child([])} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Katrina Aguilar");
    expect(links[0]).toHaveAttribute("href", "/parent/child/student-0037");
    expect(screen.getByText("Grade 7 – Rizal")).toBeInTheDocument();
  });

  it("shows a grey tile and a dash before the first tap, and no latest", () => {
    render(<ChildCard child={child([])} />);

    expect(tileBeside("Time in")).toHaveClass("bg-status-idle");
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("Out")).not.toBeInTheDocument();
    expect(screen.queryByText("Back in")).not.toBeInTheDocument();
  });

  it("shows only the time in after one tap", () => {
    render(<ChildCard child={child(["07:56"])} />);

    expect(tileBeside("Time in")).toHaveClass("bg-status-present");
    expect(screen.getByText("7:56 AM")).toBeInTheDocument();
    expect(screen.queryByText("Out")).not.toBeInTheDocument();
    expect(screen.queryByText(/taps today/)).not.toBeInTheDocument();
  });

  it("shows the time out beside it after in, out, on a blue tile", () => {
    render(<ChildCard child={child(["07:56", "16:05"])} />);

    expect(screen.getByText("7:56 AM")).toBeInTheDocument();
    expect(screen.getByText("Out")).toBeInTheDocument();
    expect(screen.getByText("4:05 PM")).toBeInTheDocument();
    expect(tileBeside("Out")).toHaveClass("bg-status-out");
    expect(screen.queryByText(/taps today/)).not.toBeInTheDocument();
  });

  it("shows Back in and the tap count after in, out, in", () => {
    render(<ChildCard child={child(["07:56", "11:00", "13:10"])} />);

    expect(screen.getByText("Back in")).toBeInTheDocument();
    expect(screen.getByText("1:10 PM")).toBeInTheDocument();
    expect(tileBeside("Back in")).toHaveClass("bg-status-present");
    expect(screen.getByText("3 taps today")).toBeInTheDocument();
  });

  it("shows the day's status", () => {
    render(<ChildCard child={child(["08:40"])} />);
    // After the default 08:05.
    expect(within(screen.getByRole("article")).getByText("Late")).toBeInTheDocument();
  });
});
