import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test.describe("Attendance: time in and time out (Step 49)", () => {
  test("shows a time out, and lists every tap of a student who came and went", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    // Grade 11 – Aguinaldo on the demo morning: Precious Rivera went home at
    // 8:40; Rodel Espiritu went out at 8:20 and came back at 8:52 (seed taps).
    await page.goto("/attendance?date=2026-06-19&grade=11&section=Aguinaldo");

    const tapsButton = page.getByRole("button", { name: /3 taps.*Rodel Espiritu/ }).locator("visible=true");
    await expect(page.getByText("8:40 AM").locator("visible=true")).toBeVisible();
    await tapsButton.click();

    const dialog = page.getByRole("dialog", { name: "Rodel Espiritu's taps" });
    await expect(dialog.getByRole("listitem")).toHaveText([
      /1\. In\s*8:01 AM/,
      /2\. Out\s*8:20 AM/,
      /3\. In\s*8:52 AM/,
    ]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(tapsButton).toBeFocused();
  });
});
