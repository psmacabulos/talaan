import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";
import { testStudentName, testLrn } from "./test-data";

test.describe("Students", () => {
  test("add a student with all fields", async ({ page, context, baseURL }, testInfo) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    // The project's name is part of the student's name and LRN: the mobile
    // and desktop runs start in the same millisecond often enough that
    // TEST_RUN_ID alone gave both the same name, and the search then found
    // two students.
    const firstName = testStudentName(`add${testInfo.project.name}`);
    const lastName = "Testerson";
    const lrn = testLrn(testInfo.project.name === "mobile" ? 1 : 2);
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

  test("replace a student's card", async ({ page, context, baseURL }, testInfo) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    // An existing seed student with an active card, a different one per
    // project: the mobile and desktop runs share one database and run at the
    // same time, so on one shared student the first run's "mark as lost"
    // made the other run's replace fail. Juan Cruz is student-0001 (seeded
    // with a lost card plus its active replacement, src/data/seed/cards.ts);
    // Rosa Castillo is student-0008, whom no other browser test touches.
    const studentName = testInfo.project.name === "mobile" ? "Rosa Castillo" : "Juan Cruz";
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

    // Link a real card the way the USB reader does it (Step 44.7): it types
    // a card's 10 digits into the focused field and presses Enter. Random,
    // so the mobile and desktop runs never link the same card twice.
    await expect(dialog.getByRole("button", { name: "Simulate a card tap" })).toBeVisible();
    const readerDigits = String(Math.floor(Math.random() * 0xffffffff)).padStart(10, "0");
    const serialField = dialog.getByLabel("Card serial");
    await expect(serialField).toBeFocused();
    await serialField.fill(readerDigits);
    await serialField.press("Enter");
    // Enter only checks the card: it's shown in its stored form (4 hex
    // bytes), held until Save, and nothing is marked lost yet.
    await expect(dialog.getByText(/^([0-9A-F]{2}:){3}[0-9A-F]{2}$/)).toBeVisible();
    await expect(dialog.getByText("Not saved yet. It's saved when you save the student.")).toBeVisible();

    await dialog.getByRole("button", { name: "Save student" }).click();
    await expect(page.getByText(`Saved changes to ${studentName}`)).toBeVisible();
    await expect(dialog).toBeHidden();

    // Reopened: the new card is linked (active), and the old one is in the history.
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    await expect(dialog.getByText("Linked", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/Previous cards:/)).toBeVisible();
  });

  test("a card tapped by mistake isn't saved when you cancel", async ({ page, context, baseURL }, testInfo) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    // A different seed student with an active card per project; no other
    // browser test touches these two.
    const studentName = testInfo.project.name === "mobile" ? "Jasmine Batumbakal" : "Reynaldo Abad";
    await page.getByLabel("Search students").fill(studentName);
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    const dialog = page.getByRole("dialog");
    const cardBox = dialog.getByRole("group", { name: "ID card" });
    const serialBefore = await cardBox.locator(".font-mono").first().innerText();

    await cardBox.getByRole("button", { name: "Card lost? Replace it" }).click();
    await cardBox.getByRole("button", { name: "Yes, replace card" }).click();
    const serialField = cardBox.getByLabel("Card serial");
    await expect(serialField).toBeFocused();
    await serialField.fill(String(Math.floor(Math.random() * 0xffffffff)).padStart(10, "0"));
    await serialField.press("Enter");
    await expect(cardBox.getByText("New card")).toBeVisible();

    // Cancel the whole drawer: nothing was saved, so the old card is still linked.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    await expect(cardBox.getByText("Linked", { exact: true })).toBeVisible();
    await expect(cardBox.getByText(serialBefore, { exact: true })).toBeVisible();
    await expect(cardBox.getByText(/Previous cards:/)).toBeHidden();
  });

  test("add a student's photo", async ({ page, context, baseURL }, testInfo) => {
    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");

    // A different seed student per project, for the same reason as the
    // card test above; no other browser test touches these two.
    const studentName = testInfo.project.name === "mobile" ? "Ana Manalo" : "Pedro Bernardo";
    await page.getByLabel("Search students").fill(studentName);
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("group", { name: "Photo" })).toBeVisible();

    // A plain coloured square, not a face (e2e/fixtures/photo.png). The
    // browser crops and shrinks it to a thumbnail before it's sent.
    await dialog.getByLabel("Student photo").setInputFiles("e2e/fixtures/photo.png");
    // A preview only, held until Save.
    const photo = dialog.getByRole("group", { name: "Photo" }).locator("img");
    await expect(photo).toHaveAttribute("src", /^blob:/);
    await dialog.getByRole("button", { name: "Save student" }).click();
    await expect(page.getByText(`Saved changes to ${studentName}`)).toBeVisible();
    await expect(dialog).toBeHidden();

    // Reopened, the drawer shows the stored photo, loaded through the photo route.
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    await expect(photo).toHaveAttribute("src", /^\/api\/v1\/photos\/school-balanga\/student-\d+\/\w+\.(webp|jpeg)$/);
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(256);
    await expect(dialog.getByRole("button", { name: "Change photo" })).toBeVisible();
  });
});
