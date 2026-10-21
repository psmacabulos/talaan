import { expect, test } from "@playwright/test";
import { signInAs } from "./sessions";
import { activeCardSerialFor, readerDigitsFor, TEST_GATE_TOKEN, TEST_MONITOR_TOKEN } from "./test-data";

test.describe("Gate monitor (Step 48)", () => {
  test("a tap sent to the gate API appears on the open monitor with no reload", async ({
    page,
    context,
    baseURL,
    request,
  }, testInfo) => {
    // A different student per project: both run at once on one database, and
    // the monitor shows the whole school's taps.
    const studentName = testInfo.project.name === "mobile" ? "Elena Dela Cruz" : "Francisco Custodio";
    await signInAs(context, "principal", baseURL!);
    await page.goto("/gate/display");
    await expect(page.getByRole("heading", { name: "Gate monitor" })).toBeVisible();
    // The student's entries showing a given direction, in the newest panel or
    // the "Earlier" list. Counted by direction, not by name alone: the list
    // keeps only the latest taps, so their demo-morning "Time in" can drop
    // off the end at the very moment the new tap arrives (P-029). (Not "the
    // newest panel" alone: under the pinned demo clock the other project's
    // tap gets the same 9:15 AM, and whichever arrives last is rightly newest.)
    const entries = (label: string) =>
      page
        .getByRole("listitem")
        .or(page.getByRole("region", { name: "Newest tap" }))
        .filter({ has: page.getByText(studentName, { exact: true }) })
        .filter({ hasText: label });
    const before = { "Time in": await entries("Time in").count(), "Time out": await entries("Time out").count() };
    // The stream is open once the page has run its effect; give it a moment.
    await page.waitForTimeout(500);

    const response = await request.post("/api/v1/gate/taps", {
      headers: { Authorization: `Bearer ${TEST_GATE_TOKEN}` },
      data: {
        clientTapId: crypto.randomUUID(),
        cardSerial: readerDigitsFor(activeCardSerialFor(studentName)),
        clientTappedAt: new Date().toISOString(),
      },
    });
    const answer = await response.json();
    expect(answer.outcome).toBe("recorded");

    // One more entry with the direction the gate just answered, with no reload,
    // can only have come through the live stream.
    const label = answer.direction === "time_in" ? "Time in" : "Time out";
    await expect(entries(label)).toHaveCount(before[label] + 1, { timeout: 5_000 });
  });

  test("a teacher doesn't get the live feed", async ({ page, context, baseURL }) => {
    await signInAs(context, "teacher", baseURL!);
    await page.goto("/gate/display");
    await expect(page.getByRole("heading", { name: "This screen isn't connected" })).toBeVisible();
    const stream = await page.request.get("/api/v1/gate/stream");
    expect(stream.status()).toBe(404);
  });

  test("a TV connects with its link, and the key leaves the address bar", async ({ page }) => {
    // No staff session at all: the TV's cookie is its only access. (The dev
    // session's default persona is replaced by real sign-in in Step 50; here
    // the monitor cookie is checked first, so it decides either way.)
    await page.goto(`/gate/display/connect?key=${TEST_MONITOR_TOKEN}`);
    await expect(page).toHaveURL(/\/gate\/display$/);
    await expect(page.getByRole("heading", { name: "Gate monitor" })).toBeVisible();
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "talaan_monitor")?.httpOnly).toBe(true);
  });

  test("a gate's key can't connect a monitor", async ({ page }) => {
    await page.goto(`/gate/display/connect?key=${TEST_GATE_TOKEN}`);
    await expect(page).toHaveURL(/\/gate\/display\?error=key$/);
  });
});
