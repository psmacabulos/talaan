import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title, description and actions", () => {
    render(
      <PageHeader
        title="Students"
        description="Everyone enrolled at this school."
        actions={<button type="button">Add student</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Students" })).toBeInTheDocument();
    expect(screen.getByText("Everyone enrolled at this school.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add student" })).toBeInTheDocument();
  });

  it("omits the description when none is given", () => {
    render(<PageHeader title="Staff" />);
    expect(screen.getByRole("heading", { name: "Staff" })).toBeInTheDocument();
  });
});
