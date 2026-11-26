import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";

/**
 * Publishing a school's privacy notice (Step 60.4). Each project uses its
 * own school (the demo data gives both version 1), so the phone-width and
 * desktop runs never publish over each other.
 */
test.describe("Privacy notice (Step 60.4)", () => {
  test("a principal publishes the next version, and it shows in Activity", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    const persona = testInfo.project.name === "mobile" ? "principal" : "oceanview_principal";
    await signInAs(context, persona, baseURL!);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Privacy notice" })).toBeVisible();
    await expect(page.getByText(/^Version 1, published/)).toBeVisible();
    const wording = page.getByLabel("Notice wording");
    await expect(wording).toHaveValue(/^Sample notice for the demo\./);

    // The same text again is refused before anything is asked.
    await page.getByRole("button", { name: "Publish as version 2…" }).click();
    await expect(page.getByText("This is the same as version 1.", { exact: false })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const newText = `Our school's own notice, ${testInfo.project.name} run.\n\n${"We keep attendance records. ".repeat(10)}`;
    await wording.fill(newText);
    await page.getByRole("button", { name: "Publish as version 2…" }).click();
    const confirm = page.getByRole("dialog", { name: "Publish version 2?" });
    await expect(confirm).toContainText("asked to read and accept version 2");
    await confirm.getByRole("button", { name: "Publish version 2" }).click();

    await expect(page.getByText("Published version 2 of the privacy notice.")).toBeVisible();
    await expect(page.getByText(/^Version 2, published/)).toBeVisible();
    await expect(page.getByText(/Earlier versions, kept as published: version 1 \(/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish as version 3…" })).toBeVisible();

    await page.goto("/activity?group=school");
    await expect(page.getByText("published a new privacy notice").first()).toBeVisible();
  });

  test("a teacher has no privacy notice to publish", async ({ context, page, baseURL }) => {
    await signInAs(context, "teacher", baseURL!);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Privacy notice" })).toHaveCount(0);
    await expect(page.getByLabel("Notice wording")).toHaveCount(0);
  });
});
