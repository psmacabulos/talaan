import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";
import {
  testEmail,
  SEED_STUDENT_LRN_FOR_PARENT_TEST,
  SEED_STUDENT_FIRST_NAME_FOR_PARENT_TEST,
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
    // Using the seeded student-0006 who is already linked to
    // parent-balanga-1 but not yet tapped today.
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap a valid card — this should pick student-0006 (the result is an
    // aria-live region, not a dialog — see tap-station-kiosk.tsx).
    await page.getByRole("button", { name: "Valid card" }).click();
    await expect(page.getByText(SEED_STUDENT_LAST_NAME_FOR_PARENT_TEST)).toBeVisible();

    // Step 2: Parent signs up with a new account.
    const newParentEmail = testEmail("parent-signup");
    await page.goto("/parent/signup");

    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Parent");
    await page.getByLabel("Email").fill(newParentEmail);
    await page.getByLabel("Mobile number").fill("09171234567");
    // Must pick Balanga since student-0006 is at that school. A Radix/
    // shadcn Select (a button, not a native <select>).
    await page.getByLabel("Your child's school").click();
    await page.getByRole("option", { name: "Balanga City National Science High School" }).click();
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByLabel("Confirm password").fill("testpass123");

    await page.getByRole("button", { name: "Create account" }).click();
    // Redirected to link-child.
    await expect(page).toHaveURL("/parent/link-child");

    // Step 3: Link the student (student-0006).
    await page.getByLabel("LRN").fill(SEED_STUDENT_LRN_FOR_PARENT_TEST);
    await page.getByLabel("Last name").fill(SEED_STUDENT_LAST_NAME_FOR_PARENT_TEST);
    await page.getByLabel("Birth date").fill(SEED_STUDENT_BIRTH_DATE_FOR_PARENT_TEST);
    await page.getByRole("button", { name: "Link this child" }).click();

    // Redirected to parent dashboard.
    await expect(page).toHaveURL("/parent");

    // Step 4: Check the notification bell.
    // The tap we made earlier should now show as a notification for this child.
    // Bell is in the header — on mobile it opens a menu.
    const notificationButton = page.getByRole("button", { name: /Notifications/ });
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();

    // Menu should show the notification (the linked child tapped in).
    // Notifications name the child by first name only (see
    // notifications-bell.tsx), unlike the station result or link-child
    // form, which use the full name / last name.
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByText(new RegExp(SEED_STUDENT_FIRST_NAME_FOR_PARENT_TEST)).first()).toBeVisible();

    // Step 5: Open the full notifications page.
    await page.getByRole("menuitem", { name: /View all/i }).click();
    await expect(page).toHaveURL("/parent/notifications");

    // The notification should be there. Scoped to <main> — a "Carmen Sison
    // is now linked" toast from the earlier link-child step can still be
    // on screen and also matches the first name.
    const notificationItem = page.locator("main").getByText(new RegExp(SEED_STUDENT_FIRST_NAME_FOR_PARENT_TEST));
    await expect(notificationItem.first()).toBeVisible();
    await expect(page.locator("main").getByText(/tapped in|tapped out/i).first()).toBeVisible();

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
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Back to dashboard and notification is still there.
    await expect(page).toHaveURL("/parent");
    const notificationStillThere = page.getByText(new RegExp(SEED_STUDENT_LAST_NAME_FOR_PARENT_TEST));
    await expect(notificationStillThere).toBeVisible();
  });
});
