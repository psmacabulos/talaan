import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

/**
 * The Devices page (Step 59.12): a principal sees their own school's gates
 * and monitors (the test database's "Test gate" and "Test guardhouse TV",
 * e2e/create-test-devices.ts), never another school's, and a teacher can't
 * open it. Connection status isn't checked here: other tests mark these
 * devices seen in whatever order they run, and the unit tests cover it.
 */
test.describe("Devices (Step 59.12)", () => {
  test("a principal sees their school's gates and monitors", async ({ context, page, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/devices");

    await expect(page.getByRole("heading", { level: 1, name: "Devices" })).toBeVisible();
    await expect(page.getByText("Test gate", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Test guardhouse TV", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Test gate (Oceanview)")).toHaveCount(0);
  });

  test("Oceanview's principal sees only Oceanview's gate", async ({ context, page, baseURL }) => {
    await signInAs(context, "oceanview_principal", baseURL!);
    await page.goto("/devices");

    await expect(page.getByText("Test gate (Oceanview)", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Test guardhouse TV")).toHaveCount(0);
  });

  test("a teacher can't open it, and doesn't see it in the menu", async ({ context, page, baseURL }) => {
    await signInAs(context, "teacher", baseURL!);
    await page.goto("/devices");

    await expect(page.getByRole("heading", { level: 1, name: "You don't have access to this page" })).toBeVisible();
    await expect(page.getByText("Test gate", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Devices" })).toHaveCount(0);
  });
});

/**
 * Adding a device (Step 59.13): a principal adds a gate and signs `/gate`
 * in with the key shown, then adds a monitor and opens its link. The two
 * projects run at once on one database, so each adds its own names.
 */
test.describe("Adding a device (Step 59.13)", () => {
  test("a principal adds a gate, then signs the gate in with the key shown once", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    const name = `Added gate (${testInfo.project.name})`;
    await signInAs(context, "principal", baseURL!);
    await page.goto("/devices");

    await page.getByRole("button", { name: "Add gate" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Device name").fill(name);
    await dialog.getByRole("button", { name: "Create device" }).click();

    await expect(dialog.getByText("Gate tablet added")).toBeVisible();
    await expect(dialog.getByText("This is the only time it will be shown.")).toBeVisible();
    const key = await dialog.getByLabel("Secret key").inputValue();
    expect(key).toMatch(/^tal_dev_/);

    // Only Close ends it: Escape doesn't, so the key isn't lost by accident.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText(name, { exact: true }).locator("visible=true")).toBeVisible();

    // The key signs a gate in.
    await page.goto(`/gate?token=${key}`);
    await expect(page.getByText(`Connected as ${name}`)).toBeVisible();
  });

  test("the same name again is refused, whatever its case or spacing", async ({ context, page, baseURL }, testInfo) => {
    const name = `Twin gate (${testInfo.project.name})`;
    await signInAs(context, "principal", baseURL!);
    await page.goto("/devices");

    await page.getByRole("button", { name: "Add gate" }).click();
    await page.getByRole("dialog").getByLabel("Device name").fill(name);
    await page.getByRole("dialog").getByRole("button", { name: "Create device" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();

    await page.getByRole("button", { name: "Add monitor" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Device name").fill(`  ${name.toUpperCase()} `);
    await dialog.getByRole("button", { name: "Create device" }).click();

    await expect(dialog.getByRole("alert")).toHaveText(/already exists at your school/);
    await expect(dialog.getByText("Monitor added")).toHaveCount(0);
  });

  test("a principal adds a monitor, and its link connects a screen", async ({ context, page, baseURL }, testInfo) => {
    const name = `Added monitor (${testInfo.project.name})`;
    await signInAs(context, "principal", baseURL!);
    await page.goto("/devices");

    await page.getByRole("button", { name: "Add monitor" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Device name").fill(name);
    await dialog.getByRole("button", { name: "Create device" }).click();

    await expect(dialog.getByText("Monitor added")).toBeVisible();
    await expect(dialog.getByRole("img", { name: "QR code of the monitor link" })).toBeVisible();
    const link = await dialog.getByLabel("Link").inputValue();
    expect(link).toContain("/gate/display/connect?key=tal_dev_");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();

    // A TV has no staff session; its link is all it has.
    await context.clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL(/\/gate\/display$/);
    await expect(page.getByRole("heading", { name: "Gate monitor" })).toBeVisible();
  });
});

