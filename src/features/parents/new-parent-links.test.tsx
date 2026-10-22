import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { schoolTimeToIso } from "@/lib/school-time";
import { NewParentLinks, newLinksLabel } from "./new-parent-links";

describe("NewParentLinks (Step 55.3)", () => {
  it("says who linked which child, and when, each opening the students page searched for the child", () => {
    render(
      <NewParentLinks
        links={[
          {
            linkId: "link-1",
            linkedAt: schoolTimeToIso("2026-10-22", "12:48"),
            parent: { firstName: "Ana", lastName: "Santos" },
            student: { id: "student-1", firstName: "Juan", lastName: "Dela Cruz" },
          },
        ]}
      />,
    );

    const row = screen.getByRole("link", { name: /Ana Santos linked Juan Dela Cruz/ });
    expect(row).toHaveAttribute("href", "/students?q=Juan%20Dela%20Cruz");
    expect(row).toHaveTextContent("October 22, 2026, 12:48 PM");
  });

  it("shows an empty state when nobody linked a child this week", () => {
    render(<NewParentLinks links={[]} />);
    expect(screen.getByText("No new parent links")).toBeInTheDocument();
    expect(screen.getByText("Parents who link a child in the last 7 days show up here.")).toBeInTheDocument();
  });

  it("counts every new link in the pill, not only the ones listed", () => {
    expect(newLinksLabel(12)).toBe("12 this week");
  });
});
