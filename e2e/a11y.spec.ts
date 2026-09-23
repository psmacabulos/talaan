import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { themePresets } from "../src/lib/theme/presets";
import { previewThemePreset, signInAs, type Persona } from "./sessions";

/** WCAG 2.0, 2.1 and 2.2 at levels A and AA: CLAUDE.md's accessibility bar. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

type Screen = { name: string; path: string; as: Persona };

const SCREENS: Screen[] = [
  { name: "login", path: "/", as: "anonymous" },
  { name: "not found", path: "/no-such-page", as: "anonymous" },
  { name: "parent login", path: "/parent/login", as: "anonymous" },
  { name: "parent signup", path: "/parent/signup", as: "anonymous" },
  { name: "dashboard (principal)", path: "/dashboard", as: "principal" },
  { name: "attendance (principal)", path: "/attendance", as: "principal" },
  { name: "students (principal)", path: "/students", as: "principal" },
  { name: "staff (principal)", path: "/staff", as: "principal" },
  { name: "tap station (principal)", path: "/station", as: "principal" },
  { name: "settings (principal)", path: "/settings", as: "principal" },
  { name: "dashboard (teacher)", path: "/dashboard", as: "teacher" },
  { name: "attendance (teacher)", path: "/attendance", as: "teacher" },
  { name: "students (teacher)", path: "/students", as: "teacher" },
  { name: "access denied (teacher)", path: "/staff", as: "teacher" },
  { name: "schools (super admin)", path: "/schools", as: "super_admin" },
  { name: "dashboard (super admin)", path: "/dashboard", as: "super_admin" },
  { name: "parent home", path: "/parent", as: "parent" },
  { name: "parent link a child", path: "/parent/link-child", as: "parent" },
  { name: "parent notifications", path: "/parent/notifications", as: "parent" },
];

/**
 * Runs axe on whatever is on screen now. Serious and critical findings fail
 * the test; moderate and minor ones are attached to the report so they stay
 * visible without blocking.
 */
async function expectNoBlockingViolations(page: Page) {
  // A fade-in caught halfway reads as low contrast, so wait for one-off
  // animations to settle (endless ones, like a spinner, never will).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getTiming().iterations === Infinity,
      ),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  const blocking = violations.filter((v) =>
    BLOCKING_IMPACTS.has(v.impact ?? ""),
  );
  const other = violations.filter((v) => !BLOCKING_IMPACTS.has(v.impact ?? ""));

  for (const v of other) {
    test.info().annotations.push({
      type: `a11y ${v.impact}`,
      description: `${v.id}: ${v.help}`,
    });
  }

  const summary = blocking.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((n) => n.target.join(" ")),
  }));
  expect(summary, "serious or critical accessibility violations").toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    for (const screen of SCREENS) {
      test(screen.name, async ({ page, context, baseURL }) => {
        await signInAs(context, screen.as, baseURL!);
        await page.goto(screen.path);
        await page.waitForLoadState("networkidle");
        await expectNoBlockingViolations(page);
      });
    }

    for (const preset of themePresets) {
      test(`login and dashboard under the ${preset.id} preset`, async ({
        page,
        context,
        baseURL,
      }) => {
        await previewThemePreset(context, preset.id, baseURL!);
        await page.goto("/");
        await expectNoBlockingViolations(page);

        await signInAs(context, "principal", baseURL!);
        await page.goto("/dashboard");
        await page.waitForLoadState("networkidle");
        await expectNoBlockingViolations(page);
      });
    }
  });
}

/**
 * States that only exist after a click: drawers, dialogs, menus, form
 * errors and tap results. axe only sees what's on screen, so each one is
 * opened first and then audited.
 */
test.describe("interactive states", () => {
  test("mobile navigation drawer", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      "the drawer only exists on small screens",
    );
    await signInAs(context, "principal", baseURL!);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoBlockingViolations(page);
  });

  test("add student drawer with validation errors", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");
    await page.getByRole("button", { name: "Add student" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expectNoBlockingViolations(page);

    await drawer.getByRole("button", { name: "Add student" }).click();
    // Errors are tied to their fields (aria-invalid + aria-describedby) and
    // keyboard focus jumps to the first one, so it's read out straight away.
    await expect(page.locator(":focus")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expectNoBlockingViolations(page);
  });

  test("edit student drawer and card replace confirmation", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");
    await page
      .getByRole("button", { name: /^Edit / })
      .first()
      .click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expectNoBlockingViolations(page);

    const replace = drawer.getByRole("button", {
      name: "Card lost? Replace it",
    });
    if (await replace.isVisible()) {
      await replace.click();
      await expect(drawer.getByText("Mark this card as lost?")).toBeVisible();
      await expectNoBlockingViolations(page);
    }
  });

  test("add school drawer", async ({ page, context, baseURL }) => {
    await signInAs(context, "super_admin", baseURL!);
    await page.goto("/schools");
    await page.getByRole("button", { name: "Add school" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoBlockingViolations(page);
  });

  // Cancels instead of confirming, so the shared mock data other tests
  // read is left alone.
  test("staff row menu and remove confirmation", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/staff");
    const trigger = page.getByRole("button", {
      name: "Actions for Jose Pascual",
    });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectNoBlockingViolations(page);

    await page.getByRole("menuitem", { name: "Remove" }).click();
    await expect(
      page.getByRole("dialog", { name: "Remove Jose Pascual?" }),
    ).toBeVisible();
    await expectNoBlockingViolations(page);

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(trigger).toBeFocused();
  });

  test("tap station results", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");
    for (const label of [
      "Valid card",
      "Already tapped",
      "Lost card",
      "Unknown card",
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      // A valid tap uploads in the background and briefly disables (fades)
      // this button; audit once the upload is done, not mid-fade.
      await expect(
        page.getByRole("button", { name: "Simulate offline" }),
      ).toBeEnabled();
      await expectNoBlockingViolations(page);
    }
  });

  test("parent login and link-a-child form errors", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.goto("/parent/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(":focus")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expectNoBlockingViolations(page);

    await signInAs(context, "parent", baseURL!);
    await page.goto("/parent/link-child");
    await page.locator("form").getByRole("button").last().click();
    await expect(page.locator(":focus")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expectNoBlockingViolations(page);
  });

  test("parent notification bell", async ({ page, context, baseURL }) => {
    await signInAs(context, "parent", baseURL!);
    await page.goto("/parent");
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectNoBlockingViolations(page);
  });
});

/** Keyboard behavior axe can't see: where focus goes, and whether it comes back. */
test.describe("keyboard and focus", () => {
  for (const as of ["principal", "parent"] as const) {
    test(`skip link is the first tab stop (${as})`, async ({
      page,
      context,
      baseURL,
    }) => {
      await signInAs(context, as, baseURL!);
      await page.goto(as === "parent" ? "/parent" : "/dashboard");
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to main content" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();
    });
  }

  test("drawer traps focus, closes on Escape and restores focus", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");
    const trigger = page.getByRole("button", { name: "Add student" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const insideDrawer = await page.evaluate(
        () => !!document.activeElement?.closest("[role=dialog]"),
      );
      expect(insideDrawer, `focus after ${i + 1} tabs`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    // Same for a drawer opened from a table row rather than a button.
    const row = page.getByRole("button", { name: /^Edit / }).first();
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(row).toBeFocused();
  });

  test("mobile navigation drawer restores focus to the menu button", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      "the drawer only exists on small screens",
    );
    await signInAs(context, "principal", baseURL!);
    await page.goto("/dashboard");
    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("tap station buttons are at least 44px tall", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/station");
    for (const label of [
      "Valid card",
      "Already tapped",
      "Lost card",
      "Unknown card",
    ]) {
      const box = await page
        .getByRole("button", { name: label, exact: true })
        .boundingBox();
      expect(box!.height, label).toBeGreaterThanOrEqual(44);
    }
  });
});

/**
 * Step 27.6: on a phone, a list shows compact rows instead of a table, and the
 * page never needs sideways scrolling (WCAG 1.4.10, Reflow).
 */
test.describe("small screens", () => {
  const LIST_PAGES = [
    { path: "/staff", list: "Staff" },
    { path: "/students", list: "Students" },
  ] as const;

  for (const listPage of LIST_PAGES) {
    test(`${listPage.path} fits the screen width`, async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "phone layout only");
      await signInAs(context, "principal", baseURL!);
      await page.goto(listPage.path);
      await expect(page.getByRole("list", { name: listPage.list })).toBeVisible();
      await expect(page.getByRole("table")).toBeHidden();
      await expectNoBlockingViolations(page);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

/** Step 27.5: the light/dark menu, on each kind of screen it lives on. */
test.describe("light and dark mode toggle", () => {
  const PLACES = [
    { name: "staff top bar", path: "/dashboard", as: "principal" },
    { name: "parent header", path: "/parent", as: "parent" },
    { name: "login page", path: "/", as: "anonymous" },
  ] as const;

  for (const place of PLACES) {
    test(`menu is accessible (${place.name})`, async ({
      page,
      context,
      baseURL,
    }) => {
      await signInAs(context, place.as, baseURL!);
      await page.goto(place.path);
      await page.getByRole("button", { name: "Light or dark mode" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await expectNoBlockingViolations(page);
    });
  }

  test("choosing dark with the keyboard sticks after a reload", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Light or dark mode" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitemradio", { name: "Dark" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Light or dark mode" }).click();
    await expect(
      page.getByRole("menuitemradio", { name: "Dark" }),
    ).toBeChecked();
    await page.getByRole("menuitemradio", { name: "Match device" }).click();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  });
});
