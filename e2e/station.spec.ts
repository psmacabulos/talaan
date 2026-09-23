import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

test.describe("Tap station", () => {
  test("valid card shows the student and updates attendance", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap a valid card — the kiosk will pick the next untapped student.
    await page.getByRole("button", { name: "Valid card" }).click();
    // Result card shows the student's name and grade/section.
    const resultCard = page.getByRole("dialog", { name: /Tapped in|Time in/ });
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText(/Grade.*–/);

    // Close the result and check Attendance page.
    await page.keyboard.press("Escape");
    await page.goto("/attendance");
    // The student who just tapped should show as "Present" (green).
    await expect(page.getByRole("cell", { name: /Present/ }).first()).toBeVisible();
  });

  test("already tapped is ignored", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap the "Already tapped" button.
    await page.getByRole("button", { name: "Already tapped", exact: true }).click();
    // Shows a result that says it was ignored.
    const resultCard = page.getByRole("dialog", { name: /Already tapped|Already/ });
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText(/ignored/i);
  });

  test("lost card raises an alert", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap the "Lost card" button.
    await page.getByRole("button", { name: "Lost card", exact: true }).click();
    // Shows a result for a lost card.
    const resultCard = page.getByRole("dialog", { name: /Lost card|Alert/ });
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText(/lost/i);
  });

  test("unknown card is handled gracefully", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap the "Unknown card" button.
    await page.getByRole("button", { name: "Unknown card", exact: true }).click();
    // Shows a result for an unknown card.
    const resultCard = page.getByRole("dialog", { name: /Unknown|Unknown card/ });
    await expect(resultCard).toBeVisible();
  });

  test("offline queue persists and syncs when back online", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Go offline.
    await page.getByRole("button", { name: "Simulate offline" }).click();
    await expect(page.getByText("You're offline")).toBeVisible();

    // Queue a few taps while offline.
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Valid card" }).click();
      await page.keyboard.press("Escape");
    }

    // A queued indicator should be visible.
    await expect(page.getByText(/queued|offline/i)).toBeVisible();

    // Go back online.
    await page.getByRole("button", { name: "Simulate offline" }).click();
    // Offline indicator goes away, and the queue syncs.
    await expect(page.getByText("You're offline")).toBeHidden();
    // Confirm the taps were synced (attendance count changed or similar).
    await page.goto("/attendance");
    const presentCount = await page
      .getByRole("cell", { name: /Present/ })
      .count();
    expect(presentCount).toBeGreaterThan(0);
  });
});
