import { execFileSync } from "node:child_process";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { seedStudents } from "../src/data/seed/students";
import { e2eDatabaseUrl } from "./database";
import { activeCardSerialFor, readerDigitsFor, TEST_GATE_TOKEN, testEmail } from "./test-data";

/**
 * The parent app's API (Steps 53.3 and 53.4), called the way the Expo app will:
 * JSON, a Bearer token, no browser. Desktop project only, since nothing
 * here depends on the screen. Each test sends its own documentation-range
 * address in X-Forwarded-For, so the per-address limits are tested for real
 * without the tests sharing a count.
 */

/**
 * A Balanga student with an LRN, an active card and a seed tap in the
 * morning (07:35), whom no other test uses. Not a student without a tap:
 * the tap-station tests tap "the next untapped student", which would make
 * this test's own tap a duplicate (`docs/PROBLEMS-LOG.md`, P-022).
 */
const CHILD_NAME = "Divine Garcia";
const child = seedStudents.find((student) => `${student.firstName} ${student.lastName}` === CHILD_NAME)!;

/** What the push worker did with one notification for one phone (Step 54), read from the test database: no address shows it. */
function pushDelivery(notificationId: string, token: string): { status: string; ticketId: string | null } | null {
  const output = execFileSync("npx", ["tsx", "e2e/push-delivery.ts", notificationId, token], {
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl() },
    encoding: "utf8",
  });
  return JSON.parse(output.trim().split("\n").at(-1)!);
}

/**
 * A random IPv6 /64 in the documentation range (2001:db8::/32), the unit
 * the limits count by. Random, not a counter: each Playwright worker loads
 * this file on its own, so counters in two workers handed out the same
 * address, and a reused server still remembers a lock from the last run for
 * 15 minutes (docs/PROBLEMS-LOG.md, P-040).
 */
function freshAddress() {
  const group = () => crypto.getRandomValues(new Uint16Array(1))[0].toString(16);
  return { "X-Forwarded-For": `2001:db8:${group()}:${group()}::1` };
}

async function signUp(request: APIRequestContext, email: string, headers: Record<string, string>) {
  return request.post("/api/v1/parents/signup", {
    headers,
    data: {
      firstName: "Api",
      lastName: "Parent",
      mobile: "09171234567",
      email,
      password: "testpass123",
      deviceLabel: "Playwright",
    },
  });
}

type FeedItem = { id: string; kind: string };

test.describe("Parent API (Steps 53.3 and 53.4)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The API doesn't depend on the screen; once is enough.");
  });

  test("sign up, link a child, see a tap, read the feed, register for push, then sign out", async ({ request }) => {
    const address = freshAddress();
    const signup = await signUp(request, testEmail("api-parent"), address);
    expect(signup.status()).toBe(201);
    const { token, parent } = await signup.json();
    expect(token).toMatch(/^tal_par_/);
    expect(Object.keys(parent).sort()).toEqual(["email", "firstName", "id", "lastName", "mobile"]);
    const auth = { ...address, Authorization: `Bearer ${token}` };

    const schools = await (await request.get("/api/v1/parents/schools")).json();
    expect(schools.schools).toContainEqual({ id: "school-balanga", name: expect.any(String) });

    expect((await (await request.get("/api/v1/parents/me", { headers: auth })).json()).children).toEqual([]);

    const linked = await request.post("/api/v1/parents/children", {
      headers: auth,
      data: { schoolId: "school-balanga", lrn: child.lrn, lastName: child.lastName, birthDate: child.birthDate },
    });
    expect(linked.status()).toBe(201);
    const linkedChild = (await linked.json()).child;
    expect(linkedChild).toMatchObject({ id: child.id, firstName: child.firstName, school: { id: "school-balanga" } });
    expect(JSON.stringify(linkedChild)).not.toContain(child.lrn!);
    expect(JSON.stringify(linkedChild)).not.toContain(child.birthDate);

    const again = await request.post("/api/v1/parents/children", {
      headers: auth,
      data: { schoolId: "school-balanga", lrn: child.lrn, lastName: child.lastName, birthDate: child.birthDate },
    });
    expect(again.status()).toBe(409);
    expect((await again.json()).error.code).toBe("conflict");

    // The child taps at the gate.
    const tapAt = (clientTappedAt: string) =>
      request.post("/api/v1/gate/taps", {
        headers: { Authorization: `Bearer ${TEST_GATE_TOKEN}` },
        data: {
          clientTapId: crypto.randomUUID(),
          cardSerial: readerDigitsFor(activeCardSerialFor(CHILD_NAME)),
          clientTappedAt,
        },
      });
    const tap = await (await tapAt(new Date().toISOString())).json();
    expect(tap.outcome).toBe("recorded");

    const me = await (await request.get("/api/v1/parents/me", { headers: auth })).json();
    expect(me.children[0].today.tapCount).toBeGreaterThan(0);
    expect(me.children[0].today.timeIn).toMatch(/\+08:00$/);

    // Her seed tap is the morning's time in, so this one is her time out.
    const day = await (await request.get(`/api/v1/parents/children/${child.id}/taps`, { headers: auth })).json();
    expect(day.taps.map((tap: { kind: string }) => tap.kind)).toEqual(["time_in", "time_out"]);
    expect(day.taps[1].at).toMatch(/\+08:00$/);

    const notMine = seedStudents.find((student) => student.id !== child.id && student.schoolId === "school-balanga")!;
    const forbidden = await request.get(`/api/v1/parents/children/${notMine.id}/taps`, { headers: auth });
    expect(forbidden.status()).toBe(404);

    // The feed (Step 53.4): her time out, unread. Balanga sends time in and time out.
    const feed = async (query = "") =>
      (await request.get(`/api/v1/parents/notifications${query}`, { headers: auth })).json();
    const first = await feed();
    expect(first.notifications).toEqual([
      {
        id: expect.any(String),
        childId: child.id,
        childName: CHILD_NAME,
        kind: "time_out",
        at: expect.stringMatching(/\+08:00$/),
        read: false,
      },
    ]);
    expect(first.unreadCount).toBe(1);
    expect(first.nextBefore).toBeNull();

    // Push: the phone's Expo push token is saved; anything else is refused.
    const pushToken = `ExponentPushToken[playwright-${Date.now()}]`;
    const registered = await request.post("/api/v1/parents/push-tokens", {
      headers: auth,
      data: { token: pushToken, platform: "android" },
    });
    expect(registered.status()).toBe(204);
    const notPush = await request.post("/api/v1/parents/push-tokens", {
      headers: auth,
      data: { token: "not-a-push-token", platform: "web" },
    });
    expect(notPush.status()).toBe(400);
    expect(Object.keys((await notPush.json()).error.fields).sort()).toEqual(["platform", "token"]);

    // Back in 3 minutes later: past the 2-minute repeat window, and within
    // the 5 minutes a gate's clock may run ahead, so it's her next time in.
    const back = await (await tapAt(new Date(Date.parse(tap.tappedAt) + 3 * 60_000).toISOString())).json();
    expect(back).toMatchObject({ outcome: "recorded", direction: "time_in", notified: true });

    // One at a time: the newest, then the one before it, then nothing older.
    const page1 = await feed("?limit=1");
    expect(page1.notifications.map((item: FeedItem) => item.kind)).toEqual(["time_in"]);
    expect(page1.unreadCount).toBe(2);
    const page2 = await feed(`?limit=1&before=${encodeURIComponent(page1.nextBefore)}`);
    expect(page2.notifications.map((item: FeedItem) => item.kind)).toEqual(["time_out"]);
    expect(page2.nextBefore).toBeNull();

    // Step 54: her time in was pushed to this phone, through the log sender.
    await expect
      .poll(
        () => {
          const delivery = pushDelivery(page1.notifications[0].id, pushToken);
          return delivery && { status: delivery.status, fromLogSender: delivery.ticketId?.startsWith("log-") };
        },
        { timeout: 20_000 },
      )
      .toEqual({ status: "sent", fromLogSender: true });

    // Read marks: one, then all. Another child's notification is 404.
    const newest = page1.notifications[0].id;
    expect((await request.post(`/api/v1/parents/notifications/${newest}/read`, { headers: auth })).status()).toBe(204);
    expect((await feed()).unreadCount).toBe(1);
    const othersRead = await request.post("/api/v1/parents/notifications/notification-0001/read", { headers: auth });
    expect(othersRead.status()).toBe(404);
    expect((await request.post("/api/v1/parents/notifications/read-all", { headers: auth })).status()).toBe(204);
    expect(await feed()).toMatchObject({ unreadCount: 0 });

    // A cursor or limit the server didn't make is a 400, not the first page.
    for (const query of ["?before=not-a-cursor", "?limit=ten"]) {
      const bad = await request.get(`/api/v1/parents/notifications${query}`, { headers: auth });
      expect(bad.status()).toBe(400);
      expect((await bad.json()).error.code).toBe("invalid_input");
    }

    // Another child's photo is 404 with a parent's token, like one that doesn't exist.
    const otherPhoto = await request.get(`/api/v1/photos/school-balanga/${notMine.id}/k3x9q2ab.webp`, {
      headers: auth,
    });
    expect(otherPhoto.status()).toBe(404);

    expect((await request.post("/api/v1/parents/logout", { headers: auth })).status()).toBe(204);
    const afterLogout = await request.get("/api/v1/parents/me", { headers: auth });
    expect(afterLogout.status()).toBe(401);
    expect((await afterLogout.json()).error.code).toBe("unauthorized");
  });

  test("signs a seed parent in, and refuses a wrong email the same way as a wrong password", async ({ request }) => {
    const address = freshAddress();
    const login = await request.post("/api/v1/parents/login", {
      headers: address,
      data: { email: " PARENT-ONE@balanga.example ", password: "Talaan123!" },
    });
    expect(login.status()).toBe(200);
    expect((await login.json()).token).toMatch(/^tal_par_/);

    const wrongPassword = await request.post("/api/v1/parents/login", {
      headers: address,
      data: { email: "parent-two@balanga.example", password: "nope-nope" },
    });
    const wrongEmail = await request.post("/api/v1/parents/login", {
      headers: address,
      data: { email: `nobody-${Date.now()}@example.com`, password: "nope-nope" },
    });
    expect(wrongPassword.status()).toBe(401);
    expect(await wrongEmail.json()).toEqual(await wrongPassword.json());
  });

  test("the 5th wrong password for one email answers 429", async ({ request }) => {
    const address = freshAddress();
    const email = testEmail("api-locked");
    await signUp(request, email, address);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const response = await request.post("/api/v1/parents/login", {
        headers: address,
        data: { email, password: "wrong-wrong" },
      });
      statuses.push(response.status());
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
  });

  test("30 wrong passwords from one address lock it, whatever the emails", async ({ request }) => {
    const address = freshAddress();
    let last = 0;
    for (let i = 0; i < 30; i++) {
      const response = await request.post("/api/v1/parents/login", {
        headers: address,
        data: { email: `guess-${i}-${Date.now()}@example.com`, password: "wrong-wrong" },
      });
      last = response.status();
    }
    expect(last).toBe(429);
    const rightPassword = await request.post("/api/v1/parents/login", {
      headers: address,
      data: { email: "parent-one@balanga.example", password: "Talaan123!" },
    });
    expect(rightPassword.status()).toBe(429);
  });

  test("a gate's token, or none, is not a parent", async ({ request }) => {
    const callers: Record<string, string>[] = [
      {},
      { Authorization: `Bearer ${TEST_GATE_TOKEN}` },
      { Authorization: "Bearer tal_par_made-up" },
    ];
    for (const headers of callers) {
      const response = await request.get("/api/v1/parents/me", { headers });
      expect(response.status()).toBe(401);
    }
  });

  test("an empty sign-up names only the app's own fields", async ({ request }) => {
    const response = await request.post("/api/v1/parents/signup", { headers: freshAddress(), data: {} });
    expect(response.status()).toBe(400);
    const { error } = await response.json();
    expect(Object.keys(error.fields).sort()).toEqual(["email", "firstName", "lastName", "mobile", "password"]);
  });

  test("bad input is one error shape, with each field's message", async ({ request }) => {
    const response = await request.post("/api/v1/parents/signup", {
      headers: freshAddress(),
      data: { firstName: "", lastName: "Parent", mobile: "123", email: "not-an-email", password: "short" },
    });
    expect(response.status()).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("invalid_input");
    expect(Object.keys(error.fields).sort()).toEqual(["email", "firstName", "mobile", "password"]);
  });

  test("a reset code sets a new password and signs every other phone out (Step 55.6)", async ({ request }) => {
    const address = freshAddress();
    // The same answer, 202 {}, for a parent's email and a made-up one.
    for (const email of ["parent-two@crimsonridge.example", testEmail("reset-nobody")]) {
      const asked = await request.post("/api/v1/parents/password-reset", { headers: address, data: { email } });
      expect(asked.status()).toBe(202);
      expect(await asked.json()).toEqual({});
    }

    const email = testEmail("reset");
    const signedUp = await signUp(request, email, address);
    expect(signedUp.status()).toBe(201);
    const { token: oldToken } = await signedUp.json();

    // A code the test knows, stored as the server would: the emailed one can't be read here.
    execFileSync("npx", ["tsx", "e2e/known-reset-code.ts", email, "246810"], {
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl() },
    });
    const confirm = (code: string) =>
      request.post("/api/v1/parents/password-reset/confirm", {
        headers: address,
        data: { email, code, password: "a-new-password-1", deviceLabel: "Playwright" },
      });

    const wrong = await confirm("135790");
    expect(wrong.status()).toBe(400);
    expect((await wrong.json()).error.code).toBe("invalid_code");

    const reset = await confirm("246810");
    expect(reset.status()).toBe(200);
    const { token: newToken, parent } = await reset.json();
    expect(newToken).toMatch(/^tal_par_/);
    expect(parent.email).toBe(email);

    const me = (token: string) => request.get("/api/v1/parents/me", { headers: { Authorization: `Bearer ${token}` } });
    expect((await me(oldToken)).status()).toBe(401);
    expect((await me(newToken)).status()).toBe(200);
    expect((await confirm("246810")).status()).toBe(400);

    const signIn = (password: string) =>
      request.post("/api/v1/parents/login", { headers: address, data: { email, password } });
    expect((await signIn("testpass123")).status()).toBe(401);
    expect((await signIn("a-new-password-1")).status()).toBe(200);
  });

  test("asking for a reset code without an email is a 400 naming the field", async ({ request }) => {
    const response = await request.post("/api/v1/parents/password-reset", { headers: freshAddress(), data: {} });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "invalid_input",
      fields: { email: expect.any(String) },
    });
  });
});
