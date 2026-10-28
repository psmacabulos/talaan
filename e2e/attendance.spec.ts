import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test.describe("Attendance: time in and time out (Step 49)", () => {
  test("shows a time out, and lists every tap of a student who came and went", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    // Grade 11 – Aguinaldo on the demo morning: Precious Rivera went home at
    // 8:40; Rodel Espiritu went out at 8:20 and came back at 8:52 (seed taps).
    await page.goto("/attendance?date=2026-06-19&grade=11&section=Aguinaldo");

    const tapsButton = page.getByRole("button", { name: /3 taps.*Rodel Espiritu/ }).locator("visible=true");
    // Latest (Step 59.3): her time out, and his time in after coming back.
    await expect(page.getByText("Out 8:40 AM").locator("visible=true")).toBeVisible();
    await expect(page.getByText("Back in 8:52 AM").locator("visible=true")).toBeVisible();
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

test.describe("Attendance: record a time in and out by hand (Steps 55 and 59.4)", () => {
  test("records an untapped student's time in, then their time out, from their row, once each", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
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
    // Only this student's row: the gate tests tap other students in the same
    // class at the same pinned 9:15 AM, so "Out 9:15 AM" can be on their rows
    // too (P-055). A table row on a desktop, a list item on a phone.
    const row = page.locator("tr, li").filter({ hasText: name }).locator("visible=true");

    const button = page.getByRole("button", { name: `Record time in for ${name}` }).locator("visible=true");
    await button.click();
    const dialog = page.getByRole("dialog", { name: `Record ${name}'s time in now?` });
    await dialog.getByRole("button", { name: "Record time in" }).click();

    await expect(page.getByText(`${name}'s time in was recorded at 9:15 AM`)).toBeVisible();
    await expect(row.getByText("Recorded by staff")).toBeVisible();
    // Once tapped, the time takes the button's place, on both layouts.
    await expect(button).toHaveCount(0);

    // Now in, so the time out can be recorded (Step 59.4). The clock is
    // still pinned at 9:15 AM, so the time out is too.
    const outButton = page.getByRole("button", { name: `Record time out for ${name}` }).locator("visible=true");
    await outButton.click();
    const outDialog = page.getByRole("dialog", { name: `Record ${name}'s time out now?` });
    await outDialog.getByRole("button", { name: "Record time out" }).click();

    await expect(page.getByText(`${name}'s time out was recorded at 9:15 AM`)).toBeVisible();
    await expect(row.getByText("Out 9:15 AM")).toBeVisible();
    // Out, and no back in by hand: neither button is left.
    await expect(outButton).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Record time in for ${name}` })).toHaveCount(0);
  });
});
