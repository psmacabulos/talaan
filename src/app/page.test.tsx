import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "@/lib/session";

// The page is an async Server Component that checks for a session first
// (Step 50.1). Stub the session and the redirect, then render what it returns.
const getSession = vi.fn<() => Promise<Session | null>>();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
// The form and the shortcuts import Server Actions, which don't run in a unit test.
vi.mock("@/features/auth/actions", () => ({ signIn: vi.fn(), signInAsDemo: vi.fn() }));

const { default: LoginPage } = await import("./page");

afterEach(() => {
  vi.unstubAllEnvs();
  getSession.mockReset();
});

describe("Login page", () => {
  it("renders generic product branding, the sign-in form and, in development, the demo shortcuts", async () => {
    getSession.mockResolvedValue(null);
    render(await LoginPage());

    // Two "Attendance portal" headings exist in the DOM on purpose — the
    // desktop art panel and the mobile-only compact heading are mutually
    // exclusive via `hidden lg:flex` / `lg:hidden`, never both visible at
    // once. Neither names a specific school (see login-art-panel.tsx).
    expect(screen.getAllByRole("heading", { name: /attendance portal/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/national science high school/i)).not.toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^principal$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^teacher$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^super admin$/i })).toBeInTheDocument();
  });

  it("leaves out the demo shortcuts in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getSession.mockResolvedValue(null);
    render(await LoginPage());

    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.queryByText(/try the prototype as/i)).not.toBeInTheDocument();
  });

  it("sends someone already signed in straight to the dashboard", async () => {
    getSession.mockResolvedValue({ userId: "staff-1", role: "principal", schoolId: "school-a" });
    await expect(LoginPage()).rejects.toThrow("redirect:/dashboard");
  });
});
