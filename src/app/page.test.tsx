import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

describe("Login page", () => {
  it("renders generic product branding, the sign-in form and the demo shortcuts", () => {
    render(<LoginPage />);

    // Two "Attendance portal" headings exist in the DOM on purpose — the
    // desktop art panel and the mobile-only compact heading are mutually
    // exclusive via `hidden lg:flex` / `lg:hidden`, never both visible at
    // once. Neither names a specific school (see login-art-panel.tsx).
    expect(screen.getAllByRole("heading", { name: /attendance portal/i }).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/national science high school/i)).not.toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^principal$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^teacher$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^super admin$/i })).toBeInTheDocument();
  });
});
