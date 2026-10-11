import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill, statusLabel } from "./status-pill";

describe("StatusPill", () => {
  it.each([
    ["present", "Present"],
    ["late", "Late"],
    ["absent", "Absent"],
    ["idle", "Not yet tapped"],
  ] as const)("renders the label for %s", (status, label) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("uses the weekend words on a flexible day", () => {
    render(
      <>
        <StatusPill status="present" flexible />
        <StatusPill status="idle" flexible />
      </>,
    );
    expect(screen.getByText("Came in")).toBeInTheDocument();
    expect(screen.getByText("No tap")).toBeInTheDocument();
  });
});

describe("statusLabel", () => {
  it("keeps the weekday words unless the day is flexible", () => {
    expect(statusLabel("present")).toBe("Present");
    expect(statusLabel("idle")).toBe("Not yet tapped");
    expect(statusLabel("present", true)).toBe("Came in");
    expect(statusLabel("idle", true)).toBe("No tap");
  });
});
