import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

/**
 * The Activity page (Step 60.1): a principal's staff invite shows up on it,
 * never with the invitee's email, a teacher can't open it, and another
 * school's principal doesn't see it. The invite is a fresh person each run,
 * so the mobile and desktop runs never clash.
 */
test.describe("Activity (Step 60.1)", () => {
  test("a staff invite shows up, with who did it, and no email", async ({ context, page, baseURL }, testInfo) => {
    const first = `Activity${testInfo.project.name}${Date.now()}`;
    const email = `activity-${testInfo.project.name}-${Date.now()}@talaan.example`;

    await signInAs(context, "principal", baseURL!);
    await page.goto("/staff");
    await page.getByRole("button", { name: "Invite staff" }).click();
    const drawer = page.getByRole("dialog", { name: "Invite staff" });
    await drawer.getByLabel("First name").fill(first);
    await drawer.getByLabel("Surname").fill("Logged");
    await drawer.getByLabel("Email").fill(email);
    await drawer.getByRole("button", { name: "Invite staff" }).click();
    await expect(page.getByRole("dialog", { name: `Send this link to ${first} Logged` })).toBeVisible();

    await page.goto("/activity?group=staff");
    await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
    const line = page.getByRole("listitem").filter({ hasText: `${first} Logged` });
    await expect(line).toContainText("(Principal) invited staff member");
    await expect(page.getByText(email)).toHaveCount(0);

    // The filter keeps to its own group.
    await page.goto("/activity?group=cards");
    await expect(page.getByRole("listitem").filter({ hasText: `${first} Logged` })).toHaveCount(0);
  });

  test("a teacher can't open it, and doesn't see it in the menu", async ({ context, page, baseURL }) => {
    await signInAs(context, "teacher", baseURL!);
    await page.goto("/activity");

    await expect(page.getByRole("heading", { level: 1, name: "You don't have access to this page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Activity" })).toHaveCount(0);
  });

  test("another school's principal never sees Balanga's lines", async ({ context, page, baseURL }) => {
    await signInAs(context, "oceanview_principal", baseURL!);
    await page.goto("/activity");

    await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
    await expect(page.getByText(/Logged/)).toHaveCount(0);
  });
});
