import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";
import {
  testEmail,
  SEED_STUDENT_LRN_FOR_PARENT_TEST,
  SEED_STUDENT_LAST_NAME_FOR_PARENT_TEST,
  SEED_STUDENT_BIRTH_DATE_FOR_PARENT_TEST,
} from "./test-data";

/**
 * The parent flow test only runs on mobile (360px) to avoid collisions
 * between concurrent test runs over the same student record.
 */
test.describe("Parent flow (mobile only)", () => {
  test.skip(({ viewport }) => viewport!.width !== 360, "phone width only");

  test("parent signs up, links a child, and sees notification", async ({
    page,
    context,
    baseURL,
  }) => {
    // Step 1: Principal taps a card at the station (to trigger a notification).
    // Using the seeded student-0006 (Abad) who is already linked to
    // parent-balanga-1 but not yet tapped today.
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap a valid card — this should pick student-0006.
    await page.getByRole("button", { name: "Valid card" }).click();
    const resultDialog = page.getByRole("dialog", { name: /Tapped/ });
    await expect(resultDialog).toBeVisible();
    const resultText = await resultDialog.textContent();
    expect(resultText).toContain("Abad"); // student-0006's last name
    await page.keyboard.press("Escape");

    // Step 2: Parent signs up with a new account.
    const newParentEmail = testEmail("parent-signup");
    await page.goto("/parent/signup");

    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Parent");
    await page.getByLabel("Email").fill(newParentEmail);
    await page.getByLabel("Mobile number").fill("09171234567");
    // Must pick Balanga since student-0006 is at that school.
    await page.getByLabel("Your child's school").selectOption("school-balanga");
    await page.getByLabel("Password").fill("testpass123");
    await page.getByLabel("Confirm password").fill("testpass123");

    await page.getByRole("button", { name: "Create account" }).click();
    // Redirected to link-child.
    await expect(page).toHaveURL("/parent/link-child");

    // Step 3: Link the student (Abad, student-0006).
    await page.getByLabel("LRN").fill(SEED_STUDENT_LRN_FOR_PARENT_TEST);
    await page.getByLabel("Last name").fill(SEED_STUDENT_LAST_NAME_FOR_PARENT_TEST);
    await page.getByLabel("Birth date").fill(SEED_STUDENT_BIRTH_DATE_FOR_PARENT_TEST);
    await page.getByRole("button", { name: "Link child" }).click();

    // Redirected to parent dashboard.
    await expect(page).toHaveURL("/parent");

    // Step 4: Check the notification bell.
    // The tap we made earlier should now show as a notification for this child.
    // Bell is in the header — on mobile it opens a menu.
    const notificationButton = page.getByRole("button", { name: /Notifications/ });
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();

    // Menu should show the notification (Abad tapped in).
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const notificationText = await menu.textContent();
    expect(notificationText).toContain(/Abad|tapped/i);

    // Step 5: Open the full notifications page.
    await page.getByRole("menuitem", { name: /View all/i }).click();
    await expect(page).toHaveURL("/parent/notifications");

    // The notification should be there.
    const notificationItem = page.getByText(/Abad/);
    await expect(notificationItem).toBeVisible();
    await expect(page.getByText(/tapped in/i)).toBeVisible();

    // Step 6: Sign out and back in.
    // On mobile, sign-out is likely in a menu or footer.
    const accountMenu = page.getByRole("button", { name: /Account|Menu|More/i }).last();
    if (await accountMenu.isVisible()) {
      await accountMenu.click();
    }

    // Or look for a sign-out link directly.
    let signOutButton = page.getByRole("button", { name: /Sign out/i }).first();
    if (!(await signOutButton.isVisible())) {
      // Try a link instead.
      signOutButton = page.getByRole("link", { name: /Sign out/i }).first();
    }

    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await expect(page).toHaveURL(/parent.*login|^\/$/);
    }

    // Sign back in.
    await page.goto("/parent/login");
    await page.getByLabel("Email").fill(newParentEmail);
    await page.getByLabel("Password").fill("testpass123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Back to dashboard and notification is still there.
    await expect(page).toHaveURL("/parent");
    const notificationStillThere = page.getByText(/Abad/);
    await expect(notificationStillThere).toBeVisible();
  });
});
