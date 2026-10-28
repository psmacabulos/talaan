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
async function signUpNewParent(page: Page, email: string, firstName = "Test") {
  await page.goto("/parent/signup");
  await page.getByLabel("First name").fill(firstName);
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
    // Step 1: the principal records a time in by hand (Step 55), which
    // notifies the child's parents like a gate tap. Carmen Sison has an LRN
    // and no tap on the demo morning, and no other test taps her.
    const student = findBalangaStudentByFullName("Carmen Sison");
    await signInAs(context, "principal", baseURL!);
    await page.goto("/attendance?date=2026-06-19&grade=7&section=Rizal");
    await page.getByRole("button", { name: "Record time in for Carmen Sison" }).locator("visible=true").click();
    await page
      .getByRole("dialog", { name: "Record Carmen Sison's time in now?" })
      .getByRole("button", { name: "Record time in" })
      .click();
    await expect(page.getByText("Carmen Sison's time in was recorded at 9:15 AM")).toBeVisible();

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

    // Step 4: Carmen's card shows her time in (Step 59.5) and opens her day.
    const card = page.getByRole("article").filter({ hasText: "Carmen Sison" });
    await expect(card.getByText("Time in")).toBeVisible();
    await expect(card.getByText("9:15 AM")).toBeVisible();
    await card.getByRole("link", { name: "Carmen Sison" }).click();
    await expect(page).toHaveURL(`/parent/child/${student!.id}`);
    await expect(page.getByRole("heading", { name: "Carmen Sison", level: 1 })).toBeVisible();
    const today = page.getByRole("region", { name: "Today" });
    await expect(today.getByText("1. In")).toBeVisible();
    await expect(today.getByText("9:15 AM")).toBeVisible();

    // A child who isn't theirs is "not found", never someone else's day.
    const notTheirs = seedStudents.find((s) => s.schoolId === "school-balanga" && s.id !== student!.id)!;
    await page.goto(`/parent/child/${notTheirs.id}`);
    await expect(page.getByRole("heading", { name: "We couldn't find that child" })).toBeVisible();
    await page.getByRole("link", { name: "Go to My children" }).click();
    await expect(page).toHaveURL("/parent");

    // Step 5: Check the notification bell.
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

    // Step 6: Open the full notifications page.
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

    // Step 7: Sign out and back in.
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

  test("a child's other guardian is told when a new parent links them (Step 55.2)", async ({
    page,
    context,
    baseURL,
  }) => {
    // Carmen Sison: linked to parent-balanga-1 in the seed (student-0006), and has an LRN. The
    // first test links her too, at the same time, so this parent has a name of its own.
    const child = findBalangaStudentByFullName("Carmen Sison")!;
    const told = (name: string) => `An account named ${name} Parent linked to Carmen Sison.`;

    await signUpNewParent(page, testEmail("guardian-told"), "Noticed");
    await linkChild(page, BALANGA, child);
    await expect(page).toHaveURL("/parent");

    // The parent who linked isn't told about themselves.
    await page.goto("/parent/notifications");
    await expect(page.locator("main").getByText(told("Noticed"))).toHaveCount(0);

    // The guardian already linked is.
    await signInAs(context, "parent", baseURL!);
    await page.goto("/parent/notifications");
    await expect(page.locator("main").getByText(told("Noticed"))).toBeVisible();
    await expect(
      page
        .locator("main")
        .getByText(/If you don't know them, contact the school\./)
        .first(),
    ).toBeVisible();

    // The school sees the new account in Carmen's drawer (Step 55.3).
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");
    await page.getByLabel("Search students").fill("Carmen Sison");
    await page.getByRole("button", { name: "Edit Carmen Sison" }).click();
    await expect(
      page.getByRole("dialog").getByRole("region", { name: "Parent accounts" }).getByText("Noticed Parent"),
    ).toBeVisible();
  });

  test("the principal removes a wrong link, the parent can't link again until allowed (Step 55.4)", async ({
    page,
    context,
    baseURL,
    request,
  }) => {
    // Carmen Sison again (see the test above): this parent has a name of its own.
    const child = findBalangaStudentByFullName("Carmen Sison")!;
    const email = testEmail("removed-parent");
    await signUpNewParent(page, email, "Removable");
    await linkChild(page, BALANGA, child);
    await expect(page).toHaveURL("/parent");

    // The principal's sign-in is another cookie: the parent stays signed in too.
    await signInAs(context, "principal", baseURL!);
    const openCarmen = async () => {
      await page.goto("/students");
      await page.getByLabel("Search students").fill("Carmen Sison");
      await page.getByRole("button", { name: "Edit Carmen Sison" }).click();
      return page.getByRole("dialog").getByRole("region", { name: "Parent accounts" });
    };
    let accounts = await openCarmen();
    await accounts.getByRole("button", { name: "Remove Removable Parent" }).click();
    const confirm = page.getByRole("dialog", { name: "Remove Removable Parent from Carmen's parent accounts?" });
    await confirm.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Removable Parent was removed from Carmen's parent accounts.")).toBeVisible();
    // Its button left with its row, so focus lands on the section, still in the drawer.
    await expect(accounts.getByRole("heading", { name: "Parent accounts" })).toBeFocused();
    await expect(accounts.getByRole("button", { name: "Allow Removable Parent again" })).toBeVisible();

    // The parent no longer sees Carmen, and can't link her again.
    await page.goto("/parent");
    await expect(page.locator("main").getByText(child.lastName)).toHaveCount(0);
    await page.goto("/parent/link-child");
    await linkChild(page, BALANGA, child);
    await expect(
      page.getByText("This child can't be linked to your account. Contact your child's school."),
    ).toBeVisible();

    // The parent app gets 403 link_blocked (Step 55.4).
    const address = { "X-Forwarded-For": "203.0.113.240" };
    const login = await request.post("/api/v1/parents/login", {
      headers: address,
      data: { email, password: "testpass123" },
    });
    const { token } = await login.json();
    const relink = await request.post("/api/v1/parents/children", {
      headers: { ...address, Authorization: `Bearer ${token}` },
      data: { schoolId: "school-balanga", lrn: child.lrn, lastName: child.lastName, birthDate: child.birthDate },
    });
    expect(relink.status()).toBe(403);
    expect((await relink.json()).error.code).toBe("link_blocked");

    // Allow again, and the parent can link Carmen.
    accounts = await openCarmen();
    await accounts.getByRole("button", { name: "Allow Removable Parent again" }).click();
    await expect(page.getByText("Removable Parent can link Carmen again.")).toBeVisible();
    await page.goto("/parent/link-child");
    await linkChild(page, BALANGA, child);
    await expect(page).toHaveURL("/parent");
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

    // Both children. No school names (Step 59.5, as in the parent app): a
    // parent knows their children's schools.
    const main = page.locator("main");
    for (const child of [balangaChild, oceanviewChild]) {
      await expect(main.getByRole("heading", { name: `${child.firstName} ${child.lastName}` })).toBeVisible();
    }
    await expect(main.getByText(BALANGA)).toHaveCount(0);
    await expect(main.getByText(OCEANVIEW)).toHaveCount(0);
  });
});
