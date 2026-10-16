import { expect, test, type APIRequestContext } from "@playwright/test";
import { seedStudents } from "../src/data/seed/students";
import { activeCardSerialFor, readerDigitsFor, TEST_GATE_TOKEN, testEmail } from "./test-data";

/**
 * The parent app's API (Step 53.3), called the way the Expo app will:
 * JSON, a Bearer token, no browser. Desktop project only, since nothing
 * here depends on the screen. Each test sends its own documentation-range
 * address (203.0.113.x) in X-Forwarded-For, so the per-address limits are
 * tested for real without the tests sharing a count.
 */

/**
 * A Balanga student with an LRN, an active card and a seed tap in the
 * morning (07:35), whom no other test uses. Not a student without a tap:
 * the tap-station tests tap "the next untapped student", which would make
 * this test's own tap a duplicate (`docs/PROBLEMS-LOG.md`, P-022).
 */
const CHILD_NAME = "Divine Garcia";
const child = seedStudents.find((student) => `${student.firstName} ${student.lastName}` === CHILD_NAME)!;

let addressCounter = 10;
function freshAddress() {
  return { "X-Forwarded-For": `203.0.113.${addressCounter++}` };
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

test.describe("Parent API (Step 53.3)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The API doesn't depend on the screen; once is enough.");
  });

  test("sign up, link a child, see a tap, then sign out", async ({ request }) => {
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

    // The child taps in at the gate.
    const tap = await request.post("/api/v1/gate/taps", {
      headers: { Authorization: `Bearer ${TEST_GATE_TOKEN}` },
      data: {
        clientTapId: crypto.randomUUID(),
        cardSerial: readerDigitsFor(activeCardSerialFor(CHILD_NAME)),
        clientTappedAt: new Date().toISOString(),
      },
    });
    expect((await tap.json()).outcome).toBe("recorded");

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
});
