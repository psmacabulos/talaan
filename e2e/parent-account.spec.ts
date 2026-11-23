import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./sessions";
import { findBalangaStudentByFullName, testEmail } from "./test-data";

const PASSWORD = "testpass123";

/**
 * Deleting a parent's own account (Step 60.2). Phone width only, like the
 * other parent flow tests, since the two projects share one database and
 * link the same seed child.
 */
test.describe("Delete my account (Step 60.2, mobile only)", () => {
  test.skip(({ viewport }) => viewport!.width !== 360, "phone width only");

  async function signUpAndLink(page: Page, email: string) {
    await page.goto("/parent/signup");
    await page.getByLabel("First name").fill("Leaving");
    await page.getByLabel("Last name").fill("Parent");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("09171234567");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/parent/link-child");

    const child = findBalangaStudentByFullName("Carmen Sison")!;
    await page.getByLabel("Your child's school").click();
    await page.getByRole("option", { name: "Balanga City National Science High School" }).click();
    await page.getByLabel("LRN").fill(child.lrn!);
    await page.getByLabel("Last name").fill(child.lastName);
    await page.getByLabel("Birth date").fill(child.birthDate);
    await page.getByRole("button", { name: "Link this child" }).click();
    await expect(page).toHaveURL("/parent");
  }

  test("a parent deletes their account with their password, and can't sign in again", async ({
    page,
    context,
    baseURL,
  }) => {
    const email = testEmail("delete-account");
    await signUpAndLink(page, email);

    await page.getByRole("link", { name: "Your account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    // A wrong password is refused under the field, and the dialog stays open.
    await page.getByRole("button", { name: "Delete my account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" });
    await dialog.getByLabel("Enter your password to confirm").fill("not-the-password");
    await dialog.getByRole("button", { name: "Delete my account" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("That password isn't right.");

    // The right one deletes it, and lands on sign-in with a note.
    await dialog.getByLabel("Enter your password to confirm").fill(PASSWORD);
    await dialog.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL("/parent/login?deleted=1");
    await expect(page.getByRole("status")).toContainText("Your account was deleted");

    // The same email and password no longer work, and the portal won't open.
    await page.getByLabel("Email").fill(email);
    await page.locator("#parent-login-password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/parent\/login/);
    await page.goto("/parent/account");
    await expect(page).toHaveURL("/parent/login");

    // The child's other guardian is untouched, and the school's Activity says so without naming anyone.
    await signInAs(context, "parent", baseURL!);
    await page.goto("/parent");
    await expect(page.getByText("Carmen Sison").first()).toBeVisible();

    await signInAs(context, "principal", baseURL!);
    await page.goto("/activity?group=parents");
    const line = page
      .getByRole("listitem")
      .filter({ hasText: "A parent deleted their parent account, which had access to Carmen Sison." })
      .first();
    await expect(line).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0);
  });
});
