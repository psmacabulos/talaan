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

    // Two headings on purpose (Step 51.6): the desktop panel's headline and
    // the phone header's logo are mutually exclusive via `hidden lg:flex` /
    // `lg:hidden`, never both visible at once. Both carry the product's
    // branding, never a specific school's (see login-art-panel.tsx).
    expect(screen.getByRole("heading", { name: /every school day, connected with care/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bantay Aral" })).toBeInTheDocument();
    // Both logos go back to the main page.
    const logoLinks = screen.getAllByRole("link", { name: "Bantay Aral" });
    expect(logoLinks).toHaveLength(2);
    for (const link of logoLinks) expect(link).toHaveAttribute("href", "/");
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
