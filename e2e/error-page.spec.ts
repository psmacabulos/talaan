import { expect, test } from "@playwright/test";

/**
 * The one error page (Step 59.1), from a page that throws on purpose. The
 * browser tests have no Sentry address, so there's nowhere to send a report
 * and no Report button; the dialog's states are covered by
 * src/features/errors/error-screen.test.tsx.
 */
test("a server error shows the error page with its reference code", async ({ page }) => {
  await page.goto("/design-system/throw");

  await expect(page.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
  await expect(page.getByText("Reference code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Report this problem" })).toHaveCount(0);
});

test("Try again stays on the error page while the error keeps happening", async ({ page }) => {
  await page.goto("/design-system/throw");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
});
