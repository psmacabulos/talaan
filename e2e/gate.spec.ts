import { expect, test } from "@playwright/test";
import { activeCardSerialFor, readerDigitsFor, TEST_GATE_TOKEN } from "./test-data";

test.describe("Gate (Step 47)", () => {
  test("a card read by the USB reader shows the student, then a second read is a duplicate", async ({
    page,
  }, testInfo) => {
    // A different student per project: both run at once on one database.
    // Both already tapped in on the demo morning, so this tap is their time
    // out (and no station test, which taps students who haven't, picks them).
    const studentName = testInfo.project.name === "mobile" ? "Antonio Ocampo" : "Miguel Gonzales";
    const digits = readerDigitsFor(activeCardSerialFor(studentName));

    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Connected as Test gate")).toBeVisible();
    // The token leaves the address bar once it's saved on the device.
    await expect(page).toHaveURL(/\/gate$/);
    await expect(page.getByText("Tap your card")).toBeVisible();

    // The reader types the card's digits and presses Enter, fast.
    await page.keyboard.type(digits);
    await page.keyboard.press("Enter");
    const panel = page.getByRole("main");
    await expect(panel.getByText(studentName).first()).toBeVisible();
    await expect(panel.getByText(/^Time out \d{1,2}:\d{2} [AP]M$/)).toBeVisible();
    await expect(page.locator('main section [aria-live="polite"]')).toHaveText(
      new RegExp(`^${studentName}: Time out `),
    );

    await page.keyboard.type(digits);
    await page.keyboard.press("Enter");
    await expect(panel.getByText(/^Already tapped at \d{1,2}:\d{2} [AP]M$/)).toBeVisible();
  });

  test("an unknown card is sent to the office, and a bad token goes back to setup", async ({ page }, testInfo) => {
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();
    // Linked to nobody; a different number per project, or the second run's
    // tap would land within 2 minutes of the first and be a duplicate.
    await page.keyboard.type(testInfo.project.name === "mobile" ? "0000000123" : "0000000456");
    await page.keyboard.press("Enter");
    const message = "Card not recognised. Please see the office.";
    // Shown on the panel, and announced to screen readers in the live region.
    await expect(page.getByRole("main").locator("section").getByText(message, { exact: true }).first()).toBeVisible();
    await expect(page.locator('main section [aria-live="polite"]')).toHaveText(message);

    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/gate?token=tal_dev_wrong");
    await expect(page.getByText("That token doesn't work. Ask the office for a new one.")).toBeVisible();
  });

  test("three cards read back to back all land, none waiting for another", async ({ page }, testInfo) => {
    // The Recent list is the tablet layout's; a phone shows only the newest.
    test.skip(testInfo.project.name !== "desktop", "Recent is only shown from 768px wide");
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();

    for (const digits of ["0000001001", "0000001002", "0000001003"]) {
      await page.keyboard.type(digits);
      await page.keyboard.press("Enter");
    }
    const recent = page.getByRole("complementary", { name: "Recent" }).getByRole("listitem");
    await expect(recent).toHaveCount(3);
    await expect(recent.filter({ hasText: "Not recognised" })).toHaveCount(3);
  });
});
