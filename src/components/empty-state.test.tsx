import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <EmptyState icon={Inbox} title="No students yet" description="Add your first student to get started." />,
    );
    expect(screen.getByText("No students yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first student to get started.")).toBeInTheDocument();
  });

  it("renders and fires the optional action", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState icon={Inbox} title="No students yet" action={{ label: "Add student", onClick }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add student" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
