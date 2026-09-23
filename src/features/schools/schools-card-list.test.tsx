import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { openSchool } from "./actions";
import { SchoolsCardList, schoolCounts } from "./schools-card-list";
import type { SchoolRow } from "./types";

// Same reasoning as staff-compact-list.test.tsx: mocking the server action
// keeps next/navigation and the mock repositories out of this rendering test.
vi.mock("./actions", () => ({
  openSchool: vi.fn(() => new Promise(() => {})),
}));

const balanga: SchoolRow = {
  school: {
    id: "school-balanga",
    name: "Balanga City National Science High School",
    theme: { kind: "preset", presetId: "school" },
    showDepedLogo: false,
    notificationPreference: "time_in_and_time_out",
  },
  studentCount: 36,
  staffCount: 4,
};

const crimson: SchoolRow = {
  school: {
    id: "school-crimson",
    name: "Crimson Ridge National High School",
    theme: { kind: "preset", presetId: "crimson" },
    showDepedLogo: false,
    notificationPreference: "off",
  },
  studentCount: 1,
  staffCount: 1,
};

function cards() {
  return within(screen.getByRole("list", { name: "Schools" })).getAllByRole("listitem");
}

describe("schoolCounts", () => {
  it("counts students and staff, with one student in the singular", () => {
    expect(schoolCounts(36, 4)).toBe("36 students · 4 staff");
    expect(schoolCounts(1, 1)).toBe("1 student · 1 staff");
  });
});

describe("SchoolsCardList", () => {
  it("shows the name and counts, and leaves the theme off", () => {
    render(<SchoolsCardList items={[balanga, crimson]} />);

    const [first] = cards();
    expect(within(first).getByRole("heading", { name: "Balanga City National Science High School" })).toBeInTheDocument();
    expect(within(first).getByText("36 students · 4 staff")).toBeInTheDocument();
    expect(screen.queryByText("School")).not.toBeInTheDocument();
    expect(screen.queryByText("Crimson")).not.toBeInTheDocument();
  });

  it("tags only a school whose parent notifications are off", () => {
    render(<SchoolsCardList items={[balanga, crimson]} />);

    const [first, second] = cards();
    expect(within(first).queryByText("Notifications off")).not.toBeInTheDocument();
    expect(within(second).getByText("Notifications off")).toBeInTheDocument();
  });

  it("opens the school when its card is tapped, and waits while it opens", () => {
    render(<SchoolsCardList items={[crimson]} />);

    fireEvent.click(screen.getByRole("button", { name: "Open Crimson Ridge National High School" }));
    expect(openSchool).toHaveBeenCalledWith("school-crimson");
    expect(screen.getByRole("button", { name: "Opening Crimson Ridge National High School…" })).toBeDisabled();
  });
});
