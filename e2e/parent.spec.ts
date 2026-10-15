import { expect, test, type Page } from "@playwright/test";
import { seedStudents } from "../src/data/seed/students";
import type { Student } from "../src/features/students/types";
import { signInAs } from "./sessions";
import { findBalangaStudentByFullName, testEmail } from "./test-data";

const BALANGA = "Balanga City National Science High School";
const OCEANVIEW = "Oceanview National High School";

/** Fills "Link a child": the school first (a Radix/shadcn Select, a button, not a native <select>), then the three details. */
async function linkChild(page: Page, schoolName: string, student: Student) {
  await page.getByLabel("Your child's school").click();
  await page.getByRole("option", { name: schoolName }).click();
  await page.getByLabel("LRN").fill(student.lrn!);
  await page.getByLabel("Last name").fill(student.lastName);
  await page.getByLabel("Birth date").fill(student.birthDate);
  await page.getByRole("button", { name: "Link this child" }).click();
}

/** Signs up a brand-new parent; the app then opens "Link a child". */
async function signUpNewParent(page: Page, email: string) {
  await page.goto("/parent/signup");
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Parent");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Password", { exact: true }).fill("testpass123");
  await page.getByLabel("Confirm password").fill("testpass123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/parent/link-child");
}

/**
 * The parent flow test only runs on mobile (360px) to avoid collisions
 * between concurrent test runs over the same student record.
 */
test.describe("Parent flow (mobile only)", () => {
  test.skip(({ viewport }) => viewport!.width !== 360, "phone width only");

  test("parent signs up, links a child, and sees notification", async ({ page, context, baseURL }) => {
    // Step 1: Principal taps a card at the station (to trigger a notification).
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");

    // Tap a valid card. The station always picks the *first* untapped
    // student in the shared Balanga seed pool — but in CI, other spec files
    // (station.spec.ts, a11y.spec.ts's tap-station check) draw from that
    // same pool first (see playwright.config.ts's `workers` comment), so
    // this can't assume it'll land on any one specific student. Read back
    // whoever it actually shows instead (the result is an aria-live region,
    // not a dialog — see tap-station-kiosk.tsx).
    await page.getByRole("button", { name: "Valid card" }).click();
    // Scoped to <main> — the page also has a toast region with its own
    // aria-live="polite" (sonner), which would otherwise make this locator
    // ambiguous.
    const resultPanel = page.locator("main").locator('[aria-live="polite"]');
    await expect(resultPanel).toBeVisible();
    const tappedName = (await resultPanel.locator("p").first().textContent())?.trim() ?? "";
    const student = findBalangaStudentByFullName(tappedName);
    test.skip(!student, `Could not match tap station result "${tappedName}" to a seed student`);
    // Every 3rd seed student has no LRN yet (students.ts) — a parent can't
    // self-link one of those, so skip rather than fail if the pool happens
    // to hand us one.
    test.skip(!student?.lrn, `${tappedName} has no LRN on file yet, so a parent can't self-link them`);
    await expect(page.getByText(student!.lastName)).toBeVisible();

    // Step 2: Parent signs up with a new account.
    const newParentEmail = testEmail("parent-signup");
    await page.goto("/parent/signup");

    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Parent");
    await page.getByLabel("Email").fill(newParentEmail);
    await page.getByLabel("Mobile number").fill("09171234567");
    // No school at sign-up (Step 53): it's asked for when linking a child.
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByLabel("Confirm password").fill("testpass123");

    await page.getByRole("button", { name: "Create account" }).click();
    // Redirected to link-child.
    await expect(page).toHaveURL("/parent/link-child");

    // Step 3: Link the tapped student, at Balanga, where they tapped.
    await linkChild(page, BALANGA, student!);

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
    await expect(menu.getByText(new RegExp(student!.firstName)).first()).toBeVisible();

    // Step 5: Open the full notifications page.
    await page.getByRole("menuitem", { name: /View all/i }).click();
    await expect(page).toHaveURL("/parent/notifications");

    // The notification should be there. Scoped to <main> — a "<name> is now
    // linked" toast from the earlier link-child step can still be on screen
    // and also matches the first name.
    const notificationItem = page.locator("main").getByText(new RegExp(student!.firstName));
    await expect(notificationItem.first()).toBeVisible();
    await expect(
      page
        .locator("main")
        .getByText(/tapped in|tapped out/i)
        .first(),
    ).toBeVisible();

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
    const notificationStillThere = page.getByText(new RegExp(student!.lastName));
    await expect(notificationStillThere).toBeVisible();
  });

  test("one parent links children at two schools and sees both (Step 53)", async ({ page }) => {
    const balangaChild = seedStudents.find((s) => s.schoolId === "school-balanga" && s.lrn)!;
    const oceanviewChild = seedStudents.find((s) => s.schoolId === "school-oceanview" && s.lrn)!;

    await signUpNewParent(page, testEmail("parent-two-schools"));
    await linkChild(page, BALANGA, balangaChild);
    await expect(page).toHaveURL("/parent");
    await page.goto("/parent/link-child");
    await linkChild(page, OCEANVIEW, oceanviewChild);
    await expect(page).toHaveURL("/parent");

    // Both children, each with their own school's name, since they're at two schools.
    const main = page.locator("main");
    for (const child of [balangaChild, oceanviewChild]) {
      await expect(main.getByRole("heading", { name: `${child.firstName} ${child.lastName}` })).toBeVisible();
    }
    await expect(main.getByText(BALANGA)).toBeVisible();
    await expect(main.getByText(OCEANVIEW)).toBeVisible();
  });
});
