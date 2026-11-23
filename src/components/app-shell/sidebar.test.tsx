import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { School } from "@/features/schools/types";
import { Sidebar } from "./sidebar";

vi.mock("./nav-links", () => ({ NavLinks: () => <nav aria-label="Main" /> }));

const school = { id: "school-a", name: "Balanga City National Science High School" } as unknown as School;

describe("Sidebar (Step 59.16)", () => {
  it("signs the page with the product's name under a school's own header", () => {
    render(<Sidebar role="principal" school={school} />);
    expect(screen.getByText("Powered by")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bantay Aral" })).toBeInTheDocument();
  });

  it("shows the product once, in the header, when no school is open", () => {
    render(<Sidebar role="super_admin" school={null} />);
    expect(screen.queryByText("Powered by")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Bantay Aral" })).not.toBeInTheDocument();
  });
});
