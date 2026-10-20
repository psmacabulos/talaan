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

test.describe("Attendance: record a time in by hand (Step 55)", () => {
  test("records an untapped student's time in from their row, once", async ({ page, context, baseURL }, testInfo) => {
    await signInAs(context, "principal", baseURL!);
    // Both projects share one database, so each records a different student
    // with no tap on the demo morning (seed taps), and the clock is pinned
    // at 9:15 AM (playwright.config.ts). Both have no card on purpose: the
    // station tests' "Valid card" taps the next waiting student who has one,
    // so a carded student may already be tapped when this test runs.
    const mobile = testInfo.project.name === "mobile";
    const { name, grade, section } = mobile
      ? { name: "Manuel Flores", grade: 10, section: "Luna" }
      : { name: "Teresa Lazaro", grade: 8, section: "Bonifacio" };
    await page.goto(`/attendance?date=2026-06-19&grade=${grade}&section=${section}`);

    const button = page.getByRole("button", { name: `Record time in for ${name}` }).locator("visible=true");
    await button.click();
    const dialog = page.getByRole("dialog", { name: `Record ${name}'s time in now?` });
    await dialog.getByRole("button", { name: "Record time in" }).click();

    await expect(page.getByText(`${name}'s time in was recorded at 9:15 AM`)).toBeVisible();
    await expect(page.getByText("Recorded by staff").locator("visible=true")).toBeVisible();
    // Once tapped, the time takes the button's place, on both layouts.
    await expect(button).toHaveCount(0);
  });
});
