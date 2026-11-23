import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ActivityPage } from "@/services/audit/list-activity";
import { ActivityList } from "./activity-list";

const page: ActivityPage = {
  rows: [
    {
      id: "1",
      action: "student_updated",
      actorName: "Catherine Lopez",
      actorRole: "principal",
      targetName: "Juan Dela Cruz",
      details: { fields: ["section", "guardianMobile"] },
      createdAt: "2026-06-19T01:30:00.000Z",
    },
    {
      id: "2",
      action: "school_opened",
      actorName: "A super admin",
      actorRole: "super_admin",
      targetName: null,
      details: null,
      createdAt: "2026-06-19T01:00:00.000Z",
    },
  ],
  next: { createdAt: "2026-06-19T01:00:00.000Z", id: "7b6d3f0e-1c2a-4d5e-9f10-a1b2c3d4e5f6" },
};

describe("ActivityList (Step 60.1)", () => {
  it("reads each line as who, what and to whom, and names changed fields but never values", () => {
    render(<ActivityList page={page} group="all" isFirstPage />);
    const items = within(screen.getByRole("list", { name: "Activity" })).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("Catherine Lopez (Principal) updated student Juan Dela Cruz.");
    expect(items[0]).toHaveTextContent("Changed: section, guardian mobile");
    expect(items[1]).toHaveTextContent("A super admin (Super admin) opened the school.");
  });

  it("marks the current filter and links the older page", () => {
    render(<ActivityList page={page} group="students" isFirstPage />);

    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Everything" })).not.toHaveAttribute("aria-current");
    const older = screen.getByRole("link", { name: "Older activity" });
    expect(older.getAttribute("href")).toContain("group=students");
    expect(older.getAttribute("href")).toContain("before=");
    expect(screen.queryByRole("link", { name: "Back to newest" })).not.toBeInTheDocument();
  });

  it("offers a way back on a later page, and says so when it's empty", () => {
    render(<ActivityList page={{ rows: [], next: null }} group="all" isFirstPage={false} />);

    expect(screen.getByText("No older activity")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to newest" })).toHaveAttribute("href", "/activity");
  });

  it("explains an empty log on the first page", () => {
    render(<ActivityList page={{ rows: [], next: null }} group="all" isFirstPage />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
});
