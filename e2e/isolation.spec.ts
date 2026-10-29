import { expect, test } from "@playwright/test";
import { seedStudents } from "../src/data/seed/students";
import { seedCards } from "../src/data/seed/cards";
import { signInAs } from "./sessions";
import { readerDigitsFor, TEST_OCEANVIEW_GATE_TOKEN } from "./test-data";

/**
 * Step 51: signed in as (or tapping at) Oceanview, every way into Balanga's
 * data answers "nothing" or "not found". The unit tests try every action;
 * these try the pages and addresses a browser or a gate actually uses.
 */
const fullName = (student: { firstName: string; lastName: string }) => `${student.firstName} ${student.lastName}`;
const oceanviewNames = new Set(seedStudents.filter((s) => s.schoolId === "school-oceanview").map(fullName));
// Balanga students whose names no Oceanview student shares, so "not shown" can only mean "not reachable".
const balangaStudents = seedStudents.filter(
  (student) =>
    student.schoolId === "school-balanga" &&
    !oceanviewNames.has(fullName(student)) &&
    seedCards.some((card) => card.studentId === student.id && card.status === "active"),
);
const balangaStudent = balangaStudents[0]!;
const activeCardOf = (studentId: string) =>
  seedCards.find((card) => card.studentId === studentId && card.status === "active")!;
const oceanviewStudent = seedStudents.find((student) => student.schoolId === "school-oceanview" && student.lrn)!;

test.describe("One school can't see another's data (Step 51)", () => {
  test("Oceanview's student search finds no Balanga student", async ({ context, page, baseURL }) => {
    await signInAs(context, "oceanview_principal", baseURL!);
    await page.goto(`/students?q=${encodeURIComponent(balangaStudent.lastName)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Students" })).toBeVisible();
    await expect(page.getByText(fullName(balangaStudent))).toHaveCount(0);
  });

  test("Oceanview can't load a Balanga photo", async ({ context, page, baseURL }) => {
    await signInAs(context, "oceanview_principal", baseURL!);
    const response = await page.request.get(`/api/v1/photos/school-balanga/${balangaStudent.id}/any.webp`);
    expect(response.status()).toBe(404);
  });

  test("an Oceanview gate doesn't know a Balanga card, and its roster has no Balanga names", async ({
    request,
  }, testInfo) => {
    // A card per project: the same card tapped twice within 2 minutes is a duplicate.
    const balangaCard = activeCardOf(balangaStudents[testInfo.project.name === "mobile" ? 1 : 2]!.id);
    const headers = { Authorization: `Bearer ${TEST_OCEANVIEW_GATE_TOKEN}` };
    const tap = await request.post("/api/v1/gate/taps", {
      headers,
      data: {
        clientTapId: crypto.randomUUID(),
        cardSerial: readerDigitsFor(balangaCard.serial),
        clientTappedAt: new Date().toISOString(),
      },
    });
    expect((await tap.json()).outcome).toBe("unknown_card");

    const roster = await request.get("/api/v1/gate/roster", { headers });
    expect(roster.ok()).toBe(true);
    const body = (await roster.json()) as { students: { id: string }[] };
    expect(body.students.some((student) => student.id === balangaStudent.id)).toBe(false);
  });

  // Since Step 53 a parent picks the school when linking. Picking the wrong
  // one still finds nobody: the details only match at the child's own school.
  test("picking Balanga with an Oceanview student's details finds no match", async ({ context, page, baseURL }) => {
    await signInAs(context, "parent", baseURL!);
    await page.goto("/parent/link-child");
    await page.getByLabel("Your child's school").click();
    await page.getByRole("option", { name: "Balanga City National Science High School" }).click();
    await page.getByLabel("LRN").fill(oceanviewStudent.lrn!);
    await page.getByLabel("Last name").fill(oceanviewStudent.lastName);
    await page.getByLabel("Birth date").fill(oceanviewStudent.birthDate);
    await page.getByRole("button", { name: "Link this child" }).click();
    await expect(page.getByText(/couldn't find a student with that LRN/)).toBeVisible();
  });
});
