import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the design tokens demo with a theme toggle", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /talaan design tokens/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /toggle theme|switch to (dark|light) mode/i }),
    ).toBeInTheDocument();
  });
});
