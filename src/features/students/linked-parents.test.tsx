import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { schoolTimeToIso } from "@/lib/school-time";
import { LinkedParents } from "./linked-parents";

describe("LinkedParents (Step 55.3)", () => {
  it("lists each parent account with its mobile and the day it linked", () => {
    render(
      <LinkedParents
        childFirstName="Juan"
        guardians={[
          {
            linkId: "link-1",
            studentId: "student-1",
            linkedAt: schoolTimeToIso("2026-10-22", "12:48"),
            parent: { firstName: "Ana", lastName: "Santos", mobile: "09170000001" },
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Parent accounts" })).toBeInTheDocument();
    expect(screen.getByText(/Parents who linked Juan in the Bantay Aral app/)).toBeInTheDocument();
    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Ana Santos");
    expect(row).toHaveTextContent("09170000001 · Linked October 22, 2026");
  });

  it("says so when nobody has linked the child", () => {
    render(<LinkedParents childFirstName="Juan" guardians={[]} />);
    expect(screen.getByText("No parent has linked Juan in the app yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
