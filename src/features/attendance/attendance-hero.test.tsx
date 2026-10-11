import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttendanceHero } from "./attendance-hero";

// The hero's "Simulate a tap" button calls a server action; this test is
// only about the words around it.
vi.mock("./simulate-tap-button", () => ({ SimulateTapButton: () => null }));

const WEEKDAY_COUNTS = { present: 3, late: 1, absent: 1, idle: 0 };
const WEEKEND_COUNTS = { present: 2, late: 0, absent: 0, idle: 3 };

describe("AttendanceHero", () => {
  it("shows all four statuses on a weekday", () => {
    render(
      <AttendanceHero eyebrow="Today's attendance" subjectLabel="students are in school" counts={WEEKDAY_COUNTS} />,
    );
    expect(screen.getByText(/students are in school/)).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("Absent")).toBeInTheDocument();
    expect(screen.queryByText("Weekend: no late or absent times.")).not.toBeInTheDocument();
  });

  it("says who came in, with no late or absent, on a weekend", () => {
    render(
      <AttendanceHero
        eyebrow="Today's attendance"
        subjectLabel="students are in school"
        counts={WEEKEND_COUNTS}
        flexible
      />,
    );
    expect(screen.getByText(/of 5 students came in/)).toBeInTheDocument();
    expect(screen.getByText("Weekend: no late or absent times.")).toBeInTheDocument();
    expect(screen.getByText("Came in")).toBeInTheDocument();
    expect(screen.getByText("No tap")).toBeInTheDocument();
    expect(screen.queryByText("Late")).not.toBeInTheDocument();
    expect(screen.queryByText("Absent")).not.toBeInTheDocument();
  });
});
