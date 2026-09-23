import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("staff sign-in form shows validation errors when empty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // Errors jump focus to the first invalid field, so it should be focused.
    await expect(page.locator(":focus")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();
  });

  test("staff sign-in with valid email and password shows phase 2 message", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("principal@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // Phase 1 hasn't connected real accounts yet, so the button shows this.
    await expect(
      page.getByText("Sign-in isn't connected yet", { exact: true }),
    ).toBeVisible();
    // Still on login, not redirected.
    await expect(page).toHaveURL("/");
  });

  test("demo shortcuts are visible and clickable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Principal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Teacher" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Super admin" })).toBeVisible();
  });

  test("parent sign-in form shows validation errors when empty", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(":focus")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();
  });

  test("parent sign-in redirects to link-child for a new parent", async ({
    page,
  }) => {
    // Sign up first (parent flow test will re-use this).
    await page.goto("/parent/signup");
    const email = `parent-${Date.now()}@example.com`;
    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Parent");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("09171234567");
    // A Radix/shadcn Select (a button, not a native <select>).
    await page.getByLabel("Your child's school").click();
    await page.getByRole("option", { name: "Balanga City National Science High School" }).click();
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByLabel("Confirm password").fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();
    // After signup, redirected to link-child.
    await expect(page).toHaveURL("/parent/link-child");

    // Now sign out and sign back in.
    const signOutButton = page.getByRole("button", { name: /Sign out/i }).first();
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    }

    await page.goto("/parent/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // A signed-in parent sees the dashboard (Step 23).
    await expect(page).toHaveURL("/parent");
  });
});
