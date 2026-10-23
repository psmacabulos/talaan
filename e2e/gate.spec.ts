import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { REPEAT_WINDOW_MS } from "../src/features/gate/repeat-filter";
import { e2eDatabaseUrl } from "./database";
import { signInAs } from "./sessions";
import { activeCardSerialFor, readerDigitsFor, TEST_GATE_TOKEN } from "./test-data";

/** How many of these taps are stored, and the notifications they made, read from the test database (Step 58). */
function tapRows(ids: string[]): { taps: number; notifications: number } {
  const output = execFileSync("npx", ["tsx", "e2e/tap-rows.ts", ...ids], {
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl() },
    encoding: "utf8",
  });
  return JSON.parse(output.trim().split("\n").at(-1)!);
}

test.describe("Gate (Step 47)", () => {
  test("a card read by the USB reader shows the student, then a second read is a duplicate", async ({
    page,
  }, testInfo) => {
    // A different student per project: both run at once on one database.
    // Both already tapped in on the demo morning, so this tap is their time
    // out (and no station test, which taps students who haven't, picks them).
    const studentName = testInfo.project.name === "mobile" ? "Antonio Ocampo" : "Miguel Gonzales";
    const digits = readerDigitsFor(activeCardSerialFor(studentName));

    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Connected as Test gate")).toBeVisible();
    // The token leaves the address bar once it's saved on the device.
    await expect(page).toHaveURL(/\/gate$/);
    await expect(page.getByText("Tap your card")).toBeVisible();

    // The reader types the card's digits and presses Enter, fast.
    await page.keyboard.type(digits);
    await page.keyboard.press("Enter");
    const panel = page.getByRole("main");
    await expect(panel.getByText(studentName).first()).toBeVisible();
    // The tap card (2026-10-12): a badge, then the stamp's label and time apart.
    await expect(panel.getByText("Attendance recorded", { exact: true })).toBeVisible();
    await expect(panel.getByText("Time out", { exact: true })).toBeVisible();
    await expect(page.locator('main section [aria-live="polite"]')).toHaveText(
      new RegExp(`^${studentName}: Time out `),
    );

    // Read again at once, as a card held on the reader is: the gate sends
    // nothing and keeps the answer on screen (Step 56).
    let sent = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/v1/gate/taps")) sent += 1;
    });
    await page.keyboard.type(digits);
    await page.keyboard.press("Enter");
    await expect(panel.getByText("Attendance recorded", { exact: true })).toBeVisible();

    // Past the gate's 5 seconds, the server's 2-minute rule answers.
    await page.waitForTimeout(REPEAT_WINDOW_MS + 200);
    expect(sent).toBe(0);
    await page.keyboard.type(digits);
    await page.keyboard.press("Enter");
    await expect(panel.getByText("Already tapped", { exact: true })).toBeVisible();
    await expect(panel.getByText("First tapped at", { exact: true })).toBeVisible();
    expect(sent).toBe(1);
  });

  test("an unknown card says so every time, and a bad token goes back to setup", async ({ page }) => {
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();
    const message = "Unknown card. Please ask the gate attendant for assistance.";
    const live = page.locator('main section [aria-live="polite"]');
    // Linked to nobody. Tapped twice: an unknown card is never stored, so
    // it's never "Already tapped" (owner review, 2026-10-13).
    for (let tap = 0; tap < 2; tap++) {
      // The gate itself drops the same card within 5 seconds (Step 56), so the second read waits past that.
      if (tap > 0) await page.waitForTimeout(REPEAT_WINDOW_MS + 200);
      const answer = page.waitForResponse((response) => response.url().endsWith("/api/v1/gate/taps"));
      await page.keyboard.type("0000000123");
      await page.keyboard.press("Enter");
      expect((await (await answer).json()).outcome).toBe("unknown_card");
      // Shown on the panel, and announced to screen readers in the live region.
      await expect(
        page.getByRole("main").locator("section").getByText("Awaiting staff assistance", { exact: true }),
      ).toBeVisible();
      await expect(live).toHaveText(message);
    }

    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/gate?token=tal_dev_wrong");
    await expect(page.getByText("That token doesn't work. Ask the office for a new one.")).toBeVisible();
  });

  test("a card is still read after someone clicks a button on the page", async ({ page }, testInfo) => {
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();
    // Focus left on a button used to swallow every tap (found with the real
    // reader, 2026-10-12). The reader's Enter must not click it either.
    await page.getByRole("button", { name: "Disconnect" }).focus();
    await page.keyboard.type(testInfo.project.name === "mobile" ? "0000000789" : "0000000790");
    await page.keyboard.press("Enter");
    await expect(page.locator('main section [aria-live="polite"]')).toHaveText(
      "Unknown card. Please ask the gate attendant for assistance.",
    );
    await expect(page.getByText("Disconnect? It will need a new token.")).toBeHidden();
  });

  test("a student's photo shows at the gate, also after the page is reloaded", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    // A different student per project, with an active card; no other browser test touches them.
    const studentName = testInfo.project.name === "mobile" ? "Angelica Santos" : "Mark Torres";

    await signInAs(context, "principal", baseURL!);
    await page.goto("/students");
    await page.getByLabel("Search students").fill(studentName);
    await page.getByRole("button", { name: `Edit ${studentName}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Student photo").setInputFiles("e2e/fixtures/photo.png");
    await dialog.getByRole("button", { name: "Save student" }).click();
    await expect(page.getByText(`Saved changes to ${studentName}`)).toBeVisible();

    // The first visit stores the roster and photos on the device. The reload
    // is the case that used to show initials: the stored roster, and the
    // server answering "unchanged" (2026-10-12).
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Tap your card")).toBeVisible();

    await page.keyboard.type(readerDigitsFor(activeCardSerialFor(studentName)));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main").locator("section img").first()).toHaveAttribute("src", /^blob:/);

    // Started while the server can't answer (Step 58): the gate opens from
    // its own copies, and the photo comes from the tablet's cache.
    await page.route("**/api/v1/devices/heartbeat", (route) => route.fulfill({ status: 503 }));
    await page.reload();
    await expect(page.getByText("Connected as Test gate")).toBeVisible();
    await expect(
      page.getByText("Can't reach the server. Taps are saved on this tablet and sent when it's back."),
    ).toBeVisible();
    await page.keyboard.type(readerDigitsFor(activeCardSerialFor(studentName)));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main").locator("section img").first()).toHaveAttribute("src", /^blob:/);
  });

  test("taps read with no connection are saved, then each reaches the server once (Step 58)", async ({
    page,
    context,
  }, testInfo) => {
    // One tablet is enough: the waiting line doesn't depend on the screen's width.
    test.skip(testInfo.project.name !== "desktop", "Runs once, on the desktop project");
    // Students with a tap on the demo morning (so the station tests, which
    // tap untapped students, leave them alone) whom no other test uses.
    const students = ["Arnel Villanueva", "Cristina Aquino", "Noel Fernandez"];
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();

    await context.setOffline(true);
    for (const name of students) {
      await page.keyboard.type(readerDigitsFor(activeCardSerialFor(name)));
      await page.keyboard.press("Enter");
    }
    const strip = page.getByText("3 taps saved on this tablet, waiting to send.");
    await expect(strip).toBeVisible();
    await expect(page.getByRole("main").getByText("Saved on this tablet", { exact: true }).first()).toBeVisible();

    // Kept in the tablet's storage, with the ids they got when read, and
    // nothing has reached the server: no tap, no parent notification.
    const ids: string[] = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("talaan.gate.queue") ?? '{"waiting":[]}').waiting.map(
        (tap: { id: string }) => tap.id,
      ),
    );
    expect(ids).toHaveLength(3);
    expect(tapRows(ids)).toEqual({ taps: 0, notifications: 0 });

    // Back online: the line empties, oldest first, and each tap is stored
    // exactly once, with its notification made only now.
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(strip).toBeHidden();
    // The strip hides once the last tap is on its way; its answer comes a moment later.
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("talaan.gate.queue"))).toBeNull();
    expect(tapRows(ids)).toEqual({ taps: 3, notifications: 3 });
  });

  test("three cards read back to back all land, none waiting for another", async ({ page }, testInfo) => {
    // The Recent list is the tablet layout's; a phone shows only the newest.
    test.skip(testInfo.project.name !== "desktop", "Recent is only shown from 768px wide");
    await page.goto(`/gate?token=${TEST_GATE_TOKEN}`);
    await expect(page.getByText("Tap your card")).toBeVisible();

    for (const digits of ["0000001001", "0000001002", "0000001003"]) {
      await page.keyboard.type(digits);
      await page.keyboard.press("Enter");
    }
    const recent = page.getByRole("complementary", { name: "Recent" }).getByRole("listitem");
    await expect(recent).toHaveCount(3);
    await expect(recent.filter({ hasText: "Unknown card" })).toHaveCount(3);
  });
});
