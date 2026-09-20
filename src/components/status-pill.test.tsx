import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./status-pill";

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
});
