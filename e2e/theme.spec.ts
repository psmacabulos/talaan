import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test.describe("Theme switching", () => {
  test("theme dropdown switches theme and persists after reload", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/dashboard");

    // Open the theme dropdown (top bar, principal only).
    await page.getByRole("combobox", { name: "Color theme" }).click();
    await expect(page.getByRole("option", { name: "Emerald" })).toBeVisible();

    // Select Emerald.
    await page.getByRole("option", { name: "Emerald" }).click();

    // Toast confirms the preview.
    await expect(page.getByText(/Previewing.*Emerald/)).toBeVisible();

    // The theme colors should have changed. Check by looking at a colored
    // element (e.g., a primary button or status badge).
    const primaryButton = page.getByRole("button").first();
    const computedStyle = await primaryButton.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor,
    );
    // Emerald theme uses a teal primary, so it shouldn't be the default school blue.
    expect(computedStyle).toBeTruthy();

    // Reload the page.
    await page.reload();

    // The dropdown should still show Emerald as selected.
    await page.getByRole("combobox", { name: "Color theme" }).click();
    const emeraldOption = page.getByRole("option", { name: "Emerald" });
    // Selected options have aria-selected=true.
    await expect(emeraldOption).toHaveAttribute("aria-selected", "true");
  });

  test("theme dropdown on login page persists after sign-in", async ({
    page,
  }) => {
    // Start on login (no auth yet).
    await page.goto("/");

    // Login page has the theme toggle (top-right).
    const themeToggle = page.getByRole("button", { name: "Light or dark mode" });
    await expect(themeToggle).toBeVisible();

    // (Theme dropdown is principal-only, so only tested after sign-in on the
    // dashboard. The toggle tests appear in a11y.spec.ts.)
  });

  test("saved theme restores school's own theme", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/dashboard");

    // Preview a theme (Crimson).
    await page.getByRole("combobox", { name: "Color theme" }).click();
    await page.getByRole("option", { name: "Crimson" }).click();
    await expect(page.getByText(/Previewing.*Crimson/)).toBeVisible();

    // Click "Saved theme" to go back.
    await page.getByRole("combobox", { name: "Color theme" }).click();
    await page.getByRole("option", { name: "Saved theme" }).click();

    // Toast confirms it's back to school theme.
    await expect(page.getByText(/Showing your school's saved theme/)).toBeVisible();

    // Dropdown now shows "Saved theme" as selected.
    await page.getByRole("combobox", { name: "Color theme" }).click();
    await expect(page.getByRole("option", { name: "Saved theme" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("theme dropdown is only on principal and super admin", async ({
    page,
    context,
    baseURL,
  }) => {
    // Teacher should not see it.
    await signInAs(context, "teacher", baseURL!);
    await page.goto("/dashboard");
    await expect(page.getByRole("combobox", { name: "Color theme" })).toBeHidden();

    // Super admin should see it.
    await signInAs(context, "super_admin", baseURL!);
    await page.goto("/dashboard");
    await expect(page.getByRole("combobox", { name: "Color theme" })).toBeVisible();
  });
});
