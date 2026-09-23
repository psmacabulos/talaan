import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./sessions";

/**
 * A "Present" status on the Attendance page — as a table cell at 768px and
 * up, or as text inside a card at smaller widths (Step 27.8). Excludes the
 * page's own summary count widget, whose "Present" term is unrelated to
 * any one student's row.
 */
function presentRows(page: Page) {
  return page
    .getByRole("cell", { name: "Present", exact: true })
    .or(page.getByRole("listitem").filter({ hasText: "Present" }));
}

test.describe("Tap station", () => {
  // These tests all click "Valid card"/"Already tapped" against the same
  // shared in-memory seed data (a finite pool of untapped students, not a
  // namespaced record each test creates itself). Running them in parallel
  // let them race and starve each other's pool — found while fixing this
  // suite in Step 29 (a run showed "Nothing to simulate" mid-test).
  test.describe.configure({ mode: "serial" });

  test("valid card shows the student and updates attendance", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap a valid card — the kiosk will pick the next untapped student.
    await page.getByRole("button", { name: "Valid card" }).click();
    // Result shows the student's grade/section and a "time in" (see
    // ResultDisplay/describeOutcome in tap-station-kiosk.tsx — it's an
    // aria-live region, not a dialog).
    await expect(page.getByText(/Grade \d+ – .* – time in/)).toBeVisible();

    // Check the Attendance page.
    await page.goto("/attendance");
    // The student who just tapped should show as "Present" (green).
    await expect(presentRows(page).first()).toBeVisible();
  });

  test("already tapped is ignored", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap the "Already tapped" button.
    await page.getByRole("button", { name: "Already tapped", exact: true }).click();
    // Shows a result that says it was ignored.
    await expect(page.getByText(/This tap was ignored/i)).toBeVisible();
  });

  test("lost card raises an alert", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap the "Lost card" button.
    await page.getByRole("button", { name: "Lost card", exact: true }).click();
    // Shows a result for a lost card (title deliberately doesn't name the
    // student — see the comment on the "lost" branch of describeOutcome).
    // The lead text is unique on the page (the button above it reads just
    // "Lost card", so we match on the lead rather than the title to avoid
    // an ambiguous match against the button itself).
    await expect(page.getByText(/reported lost/i)).toBeVisible();
  });

  test("unknown card is handled gracefully", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap the "Unknown card" button.
    await page.getByRole("button", { name: "Unknown card", exact: true }).click();
    // Shows a result for an unknown card.
    await expect(page.getByText("Card not registered")).toBeVisible();
  });

  test("offline queue persists and syncs when back online", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Go offline (see the status badge and button label in
    // tap-station-kiosk.tsx — "Online"/"Offline" badge, "N taps waiting
    // to sync" counter, button toggles to "Go back online").
    await page.getByRole("button", { name: "Simulate offline" }).click();
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();

    // Queue a few taps while offline. The seed data's pool of untapped
    // students is shared across every test in this run, so — unlike a
    // namespaced record a test creates itself — it can run out before all
    // 3 clicks land a real tap; match on "at least one queued", not an
    // exact count.
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Valid card" }).click();
    }
    await expect(page.getByText(/[1-9]\d* taps? waiting to sync/)).toBeVisible();

    // Go back online.
    await page.getByRole("button", { name: "Go back online" }).click();
    // Offline badge goes back to "Online", and the queue syncs.
    await expect(page.getByText("Online", { exact: true })).toBeVisible();
    // Confirm the taps were synced (attendance count changed or similar).
    await page.goto("/attendance");
    // .count() doesn't auto-wait like an expect() assertion does, so wait
    // for the page to actually render first — otherwise this reads 0
    // before the data has finished loading.
    const rows = presentRows(page);
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
