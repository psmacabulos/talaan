import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

/**
 * The Devices page (Step 59.12): a principal sees their own school's gates
 * and monitors (the test database's "Test gate" and "Test guardhouse TV",
 * e2e/create-test-devices.ts), never another school's, and a teacher can't
 * open it. Connection status isn't checked here: other tests mark these
 * devices seen in whatever order they run, and the unit tests cover it.
 */
test.describe("Devices (Step 59.12)", () => {
  test("a principal sees their school's gates and monitors", async ({ context, page, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/devices");

    await expect(page.getByRole("heading", { level: 1, name: "Devices" })).toBeVisible();
    await expect(page.getByText("Test gate", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Test guardhouse TV", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Test gate (Oceanview)")).toHaveCount(0);
  });

  test("Oceanview's principal sees only Oceanview's gate", async ({ context, page, baseURL }) => {
    await signInAs(context, "oceanview_principal", baseURL!);
    await page.goto("/devices");

    await expect(page.getByText("Test gate (Oceanview)", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Test guardhouse TV")).toHaveCount(0);
  });

  test("a teacher can't open it, and doesn't see it in the menu", async ({ context, page, baseURL }) => {
    await signInAs(context, "teacher", baseURL!);
    await page.goto("/devices");

    await expect(page.getByRole("heading", { level: 1, name: "You don't have access to this page" })).toBeVisible();
    await expect(page.getByText("Test gate", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Devices" })).toHaveCount(0);
  });
});
