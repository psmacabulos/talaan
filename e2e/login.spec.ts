import { expect, test } from "@playwright/test";
import { SEED_STAFF_PASSWORD_HASH } from "../src/data/seed/staff-password";
import { passwordVersion } from "../src/lib/password";
import { makeStaffSessionCookie, PARENT_SESSION_COOKIE, SESSION_COOKIE } from "../src/lib/session-cookie";
import { signInAs, staffSessionCookieValue, TEST_SESSION_SECRET } from "./sessions";

const BALANGA = "Balanga City National Science High School";

test.describe("Login", () => {
  test("staff sign-in form shows validation errors when empty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // Errors jump focus to the first invalid field, so it should be focused.
    await expect(page.locator(":focus")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();
  });

  test("the principal signs in with their email and password", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("principal@school-balanga.talaan.example");
    await page.getByLabel("Password", { exact: true }).fill("Talaan123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  });

  test("a wrong email or password is refused, with no session", async ({ context, page }, testInfo) => {
    await page.goto("/");
    // An address of its own, so this run's failures never count against a real account's limit.
    await page.getByLabel("Email").fill(`nobody-${testInfo.project.name}-${Date.now()}@talaan.example`);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "That email or password isn't right." })).toBeVisible();
    await expect(page).toHaveURL("/");
    expect((await context.cookies()).some((cookie) => cookie.name === SESSION_COOKIE)).toBe(false);
  });

  test("the 5th wrong try says 'Too many tries'", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByLabel("Email").fill(`locked-${testInfo.project.name}-${Date.now()}@talaan.example`);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    const signIn = page.getByRole("button", { name: "Sign in", exact: true });
    // Next's route announcer is also an alert, so match on the text.
    const alert = page.getByRole("alert").filter({ hasText: /isn't right|Too many tries/ });
    // Each try waits for its own answer from the server (a Server Action
    // is a POST with a Next-Action header), so no two tries overlap.
    async function tryOnce() {
      const answered = page.waitForResponse(
        (response) => response.request().method() === "POST" && "next-action" in response.request().headers(),
      );
      await signIn.click();
      await answered;
    }
    for (let attempt = 1; attempt <= 4; attempt++) {
      await tryOnce();
      await expect(alert).toHaveText("That email or password isn't right.");
    }
    await tryOnce();
    await expect(alert).toHaveText("Too many tries. Wait 15 minutes and try again.");
  });

  test("the demo shortcuts aren't offered in a production build", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Try the prototype as")).toHaveCount(0);
  });

  test("parent sign-in form shows validation errors when empty", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(":focus")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();
  });

  test("parent sign-in redirects to link-child for a new parent", async ({ page }) => {
    // Sign up first (parent flow test will re-use this).
    await page.goto("/parent/signup");
    const email = `parent-${Date.now()}@example.com`;
    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Parent");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("09171234567");
    // No school at sign-up (Step 53): it's asked for when linking a child.
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByLabel("Confirm password").fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();
    // After signup, redirected to link-child.
    await expect(page).toHaveURL("/parent/link-child");

    // Now sign out and sign back in.
    const signOutButton = page.getByRole("button", { name: /Sign out/i }).first();
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    }

    await page.goto("/parent/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // A signed-in parent sees the dashboard (Step 23).
    await expect(page).toHaveURL("/parent");
  });
});

test.describe("Staff session (Steps 50 and 50.1)", () => {
  async function expectSignInScreen(page: import("@playwright/test").Page) {
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  }

  test("signed out, a staff page goes to the sign-in screen", async ({ page }) => {
    await page.goto("/dashboard");
    await expectSignInScreen(page);
  });

  test("a cookie with a forged stamp is signed out", async ({ context, page, baseURL }) => {
    const genuine = staffSessionCookieValue("staff-principal-school-balanga");
    const forged = `${genuine.slice(0, genuine.lastIndexOf("."))}.not-the-real-stamp`;
    await context.addCookies([{ name: SESSION_COOKIE, value: forged, url: baseURL! }]);
    await page.goto("/students");
    await expectSignInScreen(page);
  });

  test("a cookie made more than 30 days ago is signed out", async ({ context, page, baseURL }) => {
    const longAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const expired = makeStaffSessionCookie(
      { staffId: "staff-principal-school-balanga", pv: passwordVersion(SEED_STAFF_PASSWORD_HASH) },
      TEST_SESSION_SECRET,
      longAgo,
    );
    await context.addCookies([{ name: SESSION_COOKIE, value: expired, url: baseURL! }]);
    await page.goto("/dashboard");
    await expectSignInScreen(page);
  });

  test("the old unsigned dev cookie no longer signs anyone in", async ({ context, page, baseURL }) => {
    await context.addCookies([
      { name: "talaan-dev-session", value: "staff-principal-school-balanga", url: baseURL! },
    ]);
    await page.goto("/dashboard");
    await expectSignInScreen(page);
  });

  test("a super admin who opens a school stays a super admin", async ({ context, page, baseURL }, testInfo) => {
    await signInAs(context, "super_admin", baseURL!);
    await page.goto("/schools");
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: `Open ${BALANGA}` }).click();
    } else {
      await page.getByRole("row", { name: new RegExp(BALANGA) }).getByRole("button", { name: "Open" }).click();
    }
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: `Viewing ${BALANGA}` })).toBeVisible();
    // Still allowed on the super-admin-only Schools page, so still a super admin.
    await page.goto("/schools");
    await expect(page.getByRole("heading", { name: "Schools" }).first()).toBeVisible();
    await expect(page.getByText("Only a super admin manages schools")).toHaveCount(0);
  });

  test("Sign out ends the session", async ({ context, page, baseURL }, testInfo) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/dashboard");
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
    } else {
      await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
    }
    await expectSignInScreen(page);
    await page.goto("/dashboard");
    await expectSignInScreen(page);
  });

  test("signed in, the sign-in page goes straight to the dashboard", async ({ context, page, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });

  test("a hand-typed parent cookie is signed out of the parent portal", async ({ context, page, baseURL }) => {
    await context.addCookies([{ name: PARENT_SESSION_COOKIE, value: "parent-balanga-1", url: baseURL! }]);
    await page.goto("/parent");
    await expect(page).toHaveURL("/parent/login");
  });
});

test.describe("Set-password links (Step 50.5)", () => {
  test("a new teacher sets their password through their link, which then stops working", async ({
    browser,
    context,
    page,
    baseURL,
  }, testInfo) => {
    const email = `new-teacher-${testInfo.project.name}-${Date.now()}@talaan.example`;
    const password = "Chalkboard-2026";

    // The principal adds a teacher and gets the link to send them.
    await signInAs(context, "principal", baseURL!);
    await page.goto("/staff");
    await page.getByRole("button", { name: "Invite staff" }).click();
    const drawer = page.getByRole("dialog", { name: "Invite staff" });
    await drawer.getByLabel("First name").fill("Lorna");
    await drawer.getByLabel("Surname").fill("Villanueva");
    await drawer.getByLabel("Email").fill(email);
    await drawer.getByRole("button", { name: "Invite staff" }).click();
    const linkDialog = page.getByRole("dialog", { name: "Send this link to Lorna Villanueva" });
    await expect(linkDialog).toBeVisible();
    const link = await linkDialog.getByLabel("Link").inputValue();
    expect(link).toContain("/set-password?token=");

    // The teacher opens it in their own browser and sets a password.
    // Fresh browsers of their own, as if on the teacher's phone.
    const teacherContext = await browser.newContext({ baseURL });
    const teacher = await teacherContext.newPage();
    await teacher.goto(link);
    await expect(teacher.getByRole("heading", { name: "Set your password, Lorna" })).toBeVisible();
    await teacher.getByLabel("New password").fill(password);
    await teacher.getByLabel("Confirm password").fill(password);
    await teacher.getByRole("button", { name: "Set password and sign in" }).click();
    await expect(teacher).toHaveURL("/dashboard");

    // The same link is used up.
    await teacher.goto(link);
    await expect(teacher.getByRole("heading", { name: "This link doesn't work any more" })).toBeVisible();

    // The new password works on the sign-in screen.
    const laterContext = await browser.newContext({ baseURL });
    const later = await laterContext.newPage();
    await later.goto("/");
    await later.getByLabel("Email").fill(email);
    await later.getByLabel("Password", { exact: true }).fill(password);
    await later.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(later).toHaveURL("/dashboard");

    await teacherContext.close();
    await laterContext.close();
  });

  test("a made-up link is refused", async ({ page }) => {
    await page.goto("/set-password?token=made.up");
    await expect(page.getByRole("heading", { name: "This link doesn't work any more" })).toBeVisible();
    await expect(page.getByText(/Use “Forgot your password\?” on the sign-in page/)).toBeVisible();
  });
});

test.describe("Forgot your password (Step 55.5)", () => {
  const SENT = "If that email belongs to a staff account, we've sent a link to it. It works for 1 hour.";

  test("answers the same for a staff email and a made-up one", async ({ page }, testInfo) => {
    // One real account per project, so the 3-an-hour limit per email is never reached, even with a retry.
    const staffEmail =
      testInfo.project.name === "mobile"
        ? "teacher@school-balanga.talaan.example"
        : "principal@school-balanga.talaan.example";
    const madeUp = `nobody-${testInfo.project.name}-${Date.now()}@talaan.example`;

    await page.goto("/");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page).toHaveURL("/forgot-password");
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    for (const email of [staffEmail, madeUp]) {
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      const answer = page.getByRole("status").filter({ hasText: SENT });
      await expect(answer).toBeVisible();
      await expect(answer).toContainText(email);
      await page.getByRole("button", { name: "Send again" }).click();
    }

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("A parent's forgot password (Step 55.6)", () => {
  const SENT = "If that email belongs to a parent account, we've sent a 6-digit code to it. It works for 15 minutes.";

  test("answers the same for a parent's email and a made-up one, then asks for the code", async ({
    page,
  }, testInfo) => {
    // One real account per project, so the 3-an-hour limit per email is never reached, even with a retry.
    const parentEmail =
      testInfo.project.name === "mobile" ? "parent-one@oceanview.example" : "parent-two@oceanview.example";
    const madeUp = `nobody-${testInfo.project.name}-${Date.now()}@talaan.example`;

    await page.goto("/parent/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page).toHaveURL("/parent/forgot-password");
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    for (const email of [parentEmail, madeUp]) {
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send code" }).click();
      await expect(page.getByText(SENT)).toBeVisible();
      await expect(page.getByText(email, { exact: true })).toBeVisible();
      await expect(page.getByLabel("6-digit code")).toBeFocused();
      await page.getByRole("button", { name: "Use a different email" }).click();
    }

    // A wrong code gets the one answer for every failed code, and what was typed stays.
    await page.getByLabel("Email").fill(madeUp);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.getByLabel("6-digit code").fill("123456");
    await page.getByLabel("New password", { exact: true }).fill("a-new-password-1");
    await page.getByLabel("Confirm new password").fill("a-new-password-1");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "That code isn't right, or it has expired." })).toBeVisible();
    await expect(page.getByLabel("6-digit code")).toHaveValue("123456");

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL("/parent/login");
  });
});
