import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";
import { testStudentName } from "./test-data";

/**
 * Downloading and deleting one student (Step 60.3). The student is made
 * here, fresh for each project, so deleting never touches the seed data
 * that other tests share.
 */
test.describe("Student privacy (Step 60.3)", () => {
  test("a principal downloads a student's data, then deletes the student by typing their name", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    const first = testStudentName(`privacy${testInfo.project.name}`);
    const last = "Erasable";
    const fullName = `${first} ${last}`;

    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");
    await page.getByRole("button", { name: "Add student" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("First name").fill(first);
    await page.getByLabel("Surname").fill(last);
    await page.getByLabel("Birth date").fill("2012-03-04");
    await page.getByLabel("Grade", { exact: true }).click();
    await page.getByRole("option", { name: "Grade 8" }).click();
    await page.getByLabel("Section", { exact: true }).fill("Rizal");
    await page.getByLabel("Name", { exact: true }).fill("Maria Erasable");
    await page.getByLabel("Mobile number for alerts").fill("09171234567");
    await page.getByRole("button", { name: "Add student" }).click();
    await expect(page.getByText(new RegExp(`${first}.*${last}.*was added`))).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByLabel("Search students").fill(first);
    await page.getByRole("button", { name: `Edit ${fullName}` }).click();
    const drawer = page.getByRole("dialog");

    // The download is a JSON file with this student's record, and no other student's name.
    const downloadLink = drawer.getByRole("link", { name: `Download ${first}'s data` });
    const downloadUrl = await downloadLink.evaluate((a) => (a as HTMLAnchorElement).href);
    const response = await page.request.get(downloadUrl);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toMatch(
      /^attachment; filename="bantay-aral-erasable-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers()["cache-control"]).toBe("no-store");
    const file = await response.json();
    expect(file.student).toMatchObject({ firstName: first, lastName: last });
    expect(JSON.stringify(file)).not.toContain("Juan Cruz");

    // A wrong name is refused, with the dialog left open.
    await drawer.getByRole("button", { name: "Delete this student…" }).click();
    const confirm = page.getByRole("dialog", { name: `Delete ${fullName}?` });
    const field = confirm.getByLabel(new RegExp(`Type .*${fullName}.* to confirm`));
    await field.fill(first);
    await expect(confirm.getByRole("button", { name: "Delete everything" })).toBeDisabled();

    // The right one deletes it, and the student is gone from the list.
    await field.fill(fullName.toLowerCase());
    await confirm.getByRole("button", { name: "Delete everything" }).click();
    await expect(page.getByText(`Deleted ${fullName} and everything kept about them`)).toBeVisible();
    await expect(page.getByRole("button", { name: `Edit ${fullName}` })).toHaveCount(0);

    // The download for it is gone too.
    expect((await page.request.get(downloadUrl)).status()).toBe(404);

    // The school's Activity records both, without the name.
    await page.goto("/activity?group=students");
    await expect(
      page.getByRole("listitem").filter({ hasText: "deleted the records of a removed student" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "downloaded the data of a removed student" }).first(),
    ).toBeVisible();
    await expect(page.getByText(fullName)).toHaveCount(0);
  });

  test("a teacher has no Privacy section, and the download answers 403", async ({ context, page, baseURL }) => {
    await signInAs(context, "teacher", baseURL!);
    const response = await page.request.get(`${baseURL}/students/student-0001/export`);
    expect(response.status()).toBe(403);
  });

  test("another school's principal can't download this school's student", async ({ context, page, baseURL }) => {
    await signInAs(context, "oceanview_principal", baseURL!);
    const response = await page.request.get(`${baseURL}/students/student-0001/export`);
    expect(response.status()).toBe(404);
  });
});
