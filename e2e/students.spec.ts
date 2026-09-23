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
    await page.getByLabel("LRN").fill(lrn);
    await page.getByLabel("Grade").selectOption("10");
    await page.getByLabel("Section").selectOption("Rizal");
    await page.getByLabel("Name", { exact: true }).fill("Test Guardian");
    await page.getByLabel("Mobile number for alerts").fill("09171234567");

    await page.getByRole("button", { name: "Add student" }).click();
    // Toast confirms the save.
    await expect(page.getByText(new RegExp(`${firstName}.*${lastName}.*was added`))).toBeVisible();

    // Dialog closes.
    await expect(page.getByRole("dialog")).toBeHidden();

    // Search for the new student and verify they appear in the list.
    await page.getByLabel("Search students").fill(firstName);
    await expect(page.getByRole("row", { name: new RegExp(firstName) })).toBeVisible();
  });

  test("replace a student's card", async ({ page, context, baseURL }) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    // Use an existing seed student (student-0001, already has a card).
    const studentName = "Abalos";
    await page.getByLabel("Search students").fill(studentName);
    await page.getByRole("button", { name: /^Edit / }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Should have an active card already.
    await expect(page.getByText(/Active/)).toBeVisible();

    // Click "Card lost? Replace it".
    await page.getByRole("button", { name: "Card lost? Replace it" }).click();
    await expect(page.getByText("Mark this card as lost?")).toBeVisible();
    await page.getByRole("button", { name: "Yes, replace card" }).click();

    // Now in the waiting state, ready to tap a new card.
    await expect(page.getByText("Hold the card against the reader")).toBeVisible();

    // Simulate a card tap.
    await page.getByRole("button", { name: "Simulate a card tap" }).click();
    // Toast confirms the new card.
    await expect(page.getByText(/Card.*linked/)).toBeVisible();

    // Card should now show as active again.
    await expect(page.getByText(/Active/)).toBeVisible();

    // Old card should appear in the history.
    await expect(page.getByText(/Previous cards:/)).toBeVisible();
  });
});
