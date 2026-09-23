import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";
import { testStudentName, testLrn } from "./test-data";

test.describe("Students", () => {
  test("add a student with all fields", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    const firstName = testStudentName("add");
    const lastName = "Testerson";
    const lrn = testLrn(1);
    const birthDate = "2010-05-15";

    await page.getByRole("button", { name: "Add student" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First name").fill(firstName);
    await page.getByLabel("Surname").fill(lastName);
    await page.getByLabel("Birth date").fill(birthDate);
    await page.getByLabel("LRN (optional)").fill(lrn);
    // Grade is a Radix/shadcn Select (a button, not a native <select>), so
    // it's driven by click + option, not selectOption. Section is a plain
    // text input.
    await page.getByLabel("Grade", { exact: true }).click();
    await page.getByRole("option", { name: "Grade 10" }).click();
    await page.getByLabel("Section", { exact: true }).fill("Rizal");
    await page.getByLabel("Name", { exact: true }).fill("Test Guardian");
    await page.getByLabel("Mobile number for alerts").fill("09171234567");

    await page.getByRole("button", { name: "Add student" }).click();
    // Toast confirms the save.
    await expect(page.getByText(new RegExp(`${firstName}.*${lastName}.*was added`))).toBeVisible();

    // Dialog closes.
    await expect(page.getByRole("dialog")).toBeHidden();

    // Search for the new student and verify they appear in the list (each
    // row is an "Edit <name>" button wrapping the cells, not a <tr>).
    await page.getByLabel("Search students").fill(firstName);
    await expect(page.getByRole("button", { name: new RegExp(`Edit ${firstName}`) })).toBeVisible();
  });

  test("replace a student's card", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    // Use an existing seed student (student-0001, the one deliberately
    // seeded with a lost card plus its active replacement — see
    // src/data/seed/cards.ts).
    const studentName = "Juan Cruz";
    await page.getByLabel("Search students").fill(studentName);
    // Each row is rendered as a single "Edit <name>" button wrapping the
    // cells (not a <tr>), so this one locator both waits out the search's
    // debounce and opens the drawer.
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Should have an active card already (see "ID card" group: "Linked").
    // Scoped to the dialog — the students table behind it also shows a
    // "Linked" badge per row.
    await expect(dialog.getByText("Linked", { exact: true })).toBeVisible();

    // Click "Card lost? Replace it".
    await dialog.getByRole("button", { name: "Card lost? Replace it" }).click();
    await expect(dialog.getByText("Mark this card as lost?")).toBeVisible();
    await dialog.getByRole("button", { name: "Yes, replace card" }).click();

    // Now in the waiting state, ready to tap a new card.
    await expect(dialog.getByText("Hold the card against the reader")).toBeVisible();

    // Simulate a card tap.
    await dialog.getByRole("button", { name: "Simulate a card tap" }).click();
    // Toast confirms the new card.
    await expect(page.getByText(/Card.*linked/)).toBeVisible();

    // Card should now show as linked (active) again.
    await expect(dialog.getByText("Linked", { exact: true })).toBeVisible();

    // Old card should appear in the history.
    await expect(dialog.getByText(/Previous cards:/)).toBeVisible();
  });
});
